import { MarkSubmissionsService } from '../src/modules/mark-submissions/markSubmissions.service.js';
import { DosService } from '../src/modules/dos/dos.service.js';
import { AdmissionsService } from '../src/modules/admissions/admissions.service.js';
import { CatsService } from '../src/modules/cats/cats.service.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import * as s from '@school/shared';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { db } from '../src/config/db.js';
import { ExamsService } from '../src/modules/exams/exams.service.js';
import { CatPerformanceService } from '../src/modules/cats/catPerformance.service.js';
test(
  'closed exams, safe rescheduling, concurrent edits, generation and CAT authorization',
  { skip: !process.env.SECURITY_TEST_DATABASE_URL, timeout: 60000 },
  async () => {
    const client = postgres(process.env.SECURITY_TEST_DATABASE_URL!, {
      max: 4,
    });
    let queries = 0;
    const local = s.drizzle(client, {
      logger: {
        logQuery() {
          queries++;
        },
      },
    });
    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'execute',
      'transaction',
    ] as const;
    const saved = new Map(methods.map((key) => [key, db[key]]));
    for (const key of methods)
      (db as any)[key] = (local[key] as Function).bind(local);
    try {
      const suffix = randomUUID().slice(0, 8);
      const [role] = await db
        .insert(s.roles)
        .values({ name: `SCHEDULE_${suffix}` })
        .returning();
      const [user] = await db
        .insert(s.users)
        .values({
          email: `schedule-${suffix}@example.test`,
          passwordHash: 'fixture-only',
          firstName: 'Review',
          lastName: 'Teacher',
          nationalId: suffix,
          phoneNumber: suffix,
          roleId: role.id,
        })
        .returning();
      const [term] = await db
        .insert(s.academicTerms)
        .values({
          year: 2099,
          termNumber: 1,
          startDate: '2026-11-01',
          endDate: '2026-12-10',
        })
        .returning();
      const classes = await db
        .insert(s.classes)
        .values([
          {
            name: `Grade 3 ${suffix}`,
            numericOrder: 6,
            levelCategory: 'LOWER_PRIMARY',
          },
          {
            name: `Grade 6 ${suffix}`,
            numericOrder: 9,
            levelCategory: 'UPPER_PRIMARY',
          },
        ])
        .returning();
      const [sub] = await db
        .insert(s.subjects)
        .values({
          name: 'Schedule Math',
          code: `S${suffix}`,
          levelCategory: 'LOWER_PRIMARY',
        })
        .returning();
      const config = {
        dailyStartTime: '08:00',
        dailyEndTime: '16:00',
        breaks: [{ name: 'Tea', startTime: '10:30', endTime: '11:00' }],
      };
      const [exam] = await db
        .insert(s.examinations)
        .values({
          title: 'Review',
          termId: term.id,
          status: 'DRAFT',
          startDate: '2026-11-23',
          endDate: '2026-11-27',
          scheduleConfig: config,
        })
        .returning();
      const [a] = await db
        .insert(s.examSessions)
        .values({
          examId: exam.id,
          classId: classes[0].id,
          subjectId: sub.id,
          sessionDate: '2026-11-27',
          sessionTime: '14:30 - 15:15',
          durationMinutes: 45,
        })
        .returning();
      const moved = await ExamsService.updateExamSession(a.id, {
        sessionDate: '2026-11-27',
        sessionTime: '08:00 - 08:45',
      });
      assert.equal(moved.sessionTime, '08:00 - 08:45');
      await assert.rejects(
        () =>
          ExamsService.updateExamSession(a.id, {
            sessionTime: '10:15 - 11:00',
          }),
        /break/,
      );
      await assert.rejects(
        () =>
          ExamsService.updateExamSession(a.id, {
            sessionTime: '08:00 - 09:00',
          }),
        /duration/,
      );
      const [b] = await db
        .insert(s.examSessions)
        .values({
          examId: exam.id,
          classId: classes[1].id,
          subjectId: sub.id,
          sessionDate: '2026-11-27',
          sessionTime: '09:00 - 09:45',
          durationMinutes: 45,
        })
        .returning();
      await db.insert(s.invigilatorAllocations).values([
        { examSessionId: a.id, classId: classes[0].id, teacherId: user.id },
        { examSessionId: b.id, classId: classes[1].id, teacherId: user.id },
      ]);
      await assert.rejects(
        () =>
          ExamsService.updateExamSession(b.id, {
            sessionTime: '08:00 - 08:45',
          }),
        /invigilator/,
      );
      const results = await Promise.allSettled(
        [a.id, b.id].map((id) =>
          ExamsService.updateExamSession(id, {
            sessionDate: '2026-11-23',
            sessionTime: '11:00 - 11:45',
          }),
        ),
      );
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        1,
      );
      // A guessed draft ID must not permit entry, submission or class forwarding.
      for (const cls of classes)
        await db
          .update(s.classes)
          .set({ classTeacherId: user.id })
          .where(s.eq(s.classes.id, cls.id));
      await assert.rejects(
        () => ExamsService.terminateExamPeriod(exam.id),
        /Publish/,
      );
      await assert.rejects(
        () => ExamsService.updateExamStatus(exam.id, 'LOCKED'),
        /Publish/,
      );
      await assert.rejects(
        () =>
          MarkSubmissionsService.saveMarksheetDraft(
            exam.id,
            classes[0].id,
            sub.id,
            [],
            user.id,
            'DOS',
          ),
        /not been published/,
      );
      await assert.rejects(
        () =>
          MarkSubmissionsService.submitMarksheet(
            exam.id,
            classes[0].id,
            sub.id,
            [],
            user.id,
            'TEACHER',
          ),
        /not been published/,
      );
      await assert.rejects(
        () =>
          MarkSubmissionsService.submitClassToDeputy(
            classes[0].id,
            exam.id,
            user.id,
            'TEACHER',
          ),
        /not been published/,
      );
      assert(
        !(await ExamsService.getExams({ roleName: 'TEACHER' })).some(
          (row) => row.exam.id === exam.id,
        ),
      );
      assert(
        (await ExamsService.getExams({ roleName: 'DOS' })).some(
          (row) => row.exam.id === exam.id,
        ),
      );
      assert(
        !(await ExamsService.getExams({ roleName: 'DOS' }, true)).some(
          (row) => row.exam.id === exam.id,
        ),
      );
      await ExamsService.updateExamStatus(exam.id, 'APPROVED');
      await assert.rejects(
        () => ExamsService.terminateExamPeriod(exam.id),
        /Waiting for 2/,
      );
      for (const cls of classes)
        await db.insert(s.markSubmissions).values({
          examId: exam.id,
          classId: cls.id,
          subjectId: sub.id,
          teacherId: user.id,
          status: 'SUBMITTED',
        });
      // A generic deputy lock is not evidence of class-teacher forwarding.
      await MarkSubmissionsService.lockClassSubmissions(
        classes[0].id,
        exam.id,
        user.id,
        'DEPUTY_HEAD',
      );
      await assert.rejects(
        () => ExamsService.terminateExamPeriod(exam.id),
        /Waiting/,
      );
      await MarkSubmissionsService.submitClassToDeputy(
        classes[0].id,
        exam.id,
        user.id,
        'TEACHER',
      );
      await assert.rejects(
        () => ExamsService.terminateExamPeriod(exam.id),
        /Waiting for 1/,
      );
      await MarkSubmissionsService.submitClassToDeputy(
        classes[1].id,
        exam.id,
        user.id,
        'TEACHER',
      );
      assert.equal(
        (await ExamsService.terminationReadiness(exam.id)).canConclude,
        true,
      );
      await ExamsService.terminateExamPeriod(exam.id);
      await assert.rejects(
        () =>
          MarkSubmissionsService.saveMarksheetDraft(
            exam.id,
            classes[0].id,
            sub.id,
            [],
            user.id,
            'DOS',
          ),
        /concluded/,
      );
      await assert.rejects(
        async () =>
          MarkSubmissionsService.unlockSubmission(
            (
              await db
                .select()
                .from(s.markSubmissions)
                .where(s.eq(s.markSubmissions.examId, exam.id))
            )[0].id,
            user.id,
            'DOS',
          ),
        /concluded/,
      );
      for (const change of [
        () => ExamsService.updateExamStatus(exam.id, 'DRAFT'),
        () => ExamsService.updateExamStatus(exam.id, 'APPROVED'),
        () => ExamsService.activateExamPeriod(exam.id),
        () => ExamsService.updateExam(exam.id, { title: 'Reopened' }),
        () =>
          ExamsService.updateExamSession(a.id, {
            sessionTime: '12:00 - 12:45',
          }),
        () => ExamsService.deleteExamSession(a.id),
        () =>
          ExamsService.createExamSession({
            examId: exam.id,
            classId: classes[0].id,
            subjectId: sub.id,
            sessionDate: '2026-11-27',
            sessionTime: '08:00 - 08:45',
            durationMinutes: 45,
          }),
        () => ExamsService.deleteExam(exam.id),
      ])
        await assert.rejects(change, /concluded|reactivated/);
      // Old concluded exams have no forwarding timestamps and remain readable.
      await db
        .update(s.markSubmissions)
        .set({ forwardedToDeputyAt: null })
        .where(s.eq(s.markSubmissions.examId, exam.id));
      const archive = await MarkSubmissionsService.getClassesReviewOverview(
        exam.id,
        { id: user.id, roleName: 'DEPUTY_HEAD' } as any,
      );
      assert(
        archive
          .filter((row) => classes.some((cls) => cls.id === row.class.id))
          .every((row) => row.isReceived),
      );
      const generation = {
        examId: exam.id,
        startDate: '2026-11-23',
        endDate: '2026-11-27',
        dailyStartTime: '08:00',
        dailyEndTime: '16:00',
        breaks: [],
      };
      await assert.rejects(
        () => ExamsService.generateExamTimetable(generation),
        /concluded/,
      );
      const [next] = await db
        .insert(s.examinations)
        .values({ termId: term.id, title: 'Next' })
        .returning();
      await assert.rejects(
        () =>
          ExamsService.generateExamTimetable({
            ...generation,
            examId: next.id,
            endDate: '2026-11-23',
            dailyEndTime: '08:30',
          }),
        /Not enough/,
      );
      const previous = await db
        .select()
        .from(s.examSessions)
        .where(s.eq(s.examSessions.examId, next.id));
      assert.equal(previous.length, 0);
      await ExamsService.generateExamTimetable({
        ...generation,
        examId: next.id,
      });
      const [configured] = await db
        .select()
        .from(s.examinations)
        .where(s.eq(s.examinations.id, next.id));
      assert.equal(configured.scheduleConfig?.dailyStartTime, '08:00');
      await assert.rejects(
        () =>
          CatPerformanceService.getPerformance(
            { id: user.id, roleName: 'HEAD_TEACHER' },
            { termId: term.id },
          ),
        /available to the DoS/,
      );
      await assert.rejects(
        () =>
          CatPerformanceService.getPerformance(
            { id: user.id, roleName: 'BURSAR' },
            { termId: term.id },
          ),
        /available to the DoS/,
      );
      const [guardian] = await db
        .insert(s.guardians)
        .values({ fullName: 'Review', idNumber: suffix, phoneNumber: suffix })
        .returning();
      const [learner] = await db
        .insert(s.students)
        .values({
          firstName: 'Review',
          lastName: 'Learner',
          assessmentNumber: suffix,
          classId: classes[0].id,
          gender: 'FEMALE',
          admissionDate: '2026-01-01',
          status: 'ACTIVE',
          primaryGuardianId: guardian.id,
        })
        .returning();
      const [cat] = await db
        .insert(s.catAssessments)
        .values({
          termId: term.id,
          classId: classes[0].id,
          subjectId: sub.id,
          catNumber: 1,
          maxMarks: 50,
          createdById: user.id,
        })
        .returning();
      await db
        .insert(s.catScores)
        .values({ catId: cat.id, studentId: learner.id, marksObtained: '0' });
      const server = app.listen(0);
      try {
        if (!server.listening)
          await new Promise<void>((resolve) =>
            server.once('listening', resolve),
          );
        const address = server.address() as { port: number };
        const url = `http://127.0.0.1:${address.port}/api/cats/performance?termId=${term.id}&classId=${classes[0].id}`;
        const token = (roleName: string) =>
          jwt.sign(
            {
              id: user.id,
              email: user.email,
              roleId: role.id,
              roleName,
              tokenVersion: user.tokenVersion,
              permissions: [],
            },
            env.JWT_SECRET,
          );
        for (const roleName of ['TEACHER', 'DEPUTY_HEAD']) {
          const headers = { Authorization: `Bearer ${token(roleName)}` };
          const listResponse = await fetch(
            `http://127.0.0.1:${address.port}/api/exams`,
            { headers },
          );
          assert.equal(listResponse.status, 200);
          const list = (await listResponse.json()) as any;
          assert(list.data.every((row: any) => row.exam.status !== 'DRAFT'));
          const hidden = await fetch(
            `http://127.0.0.1:${address.port}/api/exams/${next.id}/progress`,
            { headers },
          );
          assert.equal(hidden.status, 403);
          await hidden.json();
        }
        for (const roleName of [
          'HEAD_TEACHER',
          'DEPUTY_HEAD',
          'BURSAR',
          'SECRETARY',
        ]) {
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token(roleName)}` },
          });
          assert.equal(response.status, 403);
          await response.json();
        }
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token('DOS')}` },
        });
        assert.equal(response.status, 200);
        const result = (await response.json()) as any;
        assert.equal(result.data.summary.mean, 0);
        assert.equal(result.data.supportLearners[0].studentId, learner.id);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      const before = queries;
      const performance = await CatPerformanceService.getPerformance(
        { id: user.id, roleName: 'DOS' },
        { termId: term.id, classId: classes[0].id },
      );
      assert.equal(performance.summary.mean, 0);
      assert.equal(performance.summary.needsSupport, 1);
      assert.equal(queries - before, 5);
      const more = await db
        .insert(s.students)
        .values(
          Array.from({ length: 20 }, (_, i) => ({
            firstName: 'Review',
            lastName: 'Learner',
            assessmentNumber: `${suffix}-${i}`,
            classId: classes[0].id,
            gender: 'FEMALE' as const,
            admissionDate: '2026-01-01',
            status: 'ACTIVE' as const,
            primaryGuardianId: guardian.id,
          })),
        )
        .returning();
      await db.insert(s.catScores).values(
        more.map((row) => ({
          catId: cat.id,
          studentId: row.id,
          marksObtained: '25',
        })),
      );
      const countBefore = queries;
      const larger = await CatPerformanceService.getPerformance(
        { id: user.id, roleName: 'DOS' },
        { termId: term.id, classId: classes[0].id },
      );
      assert.equal(queries - countBefore, 5);
      assert.equal(larger.summary.scored, 21);
      const subjectView = await CatPerformanceService.getPerformance(
        { id: user.id, roleName: 'DOS' },
        { termId: term.id, subjectId: sub.id },
      );
      assert.equal(subjectView.summary.enrolled, 21);
      assert.deepEqual(
        subjectView.grades.map((row) => row.id),
        [classes[0].id],
      );
      const [subjectTeacher] = await db
        .insert(s.users)
        .values({
          email: `subject-${suffix}@example.test`,
          passwordHash: 'fixture-only',
          firstName: 'Subject',
          lastName: 'Teacher',
          nationalId: `s${suffix}`,
          phoneNumber: `s${suffix}`,
          roleId: role.id,
        })
        .returning();
      const [otherSubject] = await db
        .insert(s.subjects)
        .values({
          name: 'Other subject',
          code: `O${suffix}`,
          levelCategory: 'LOWER_PRIMARY',
        })
        .returning();
      const [otherCat] = await db
        .insert(s.catAssessments)
        .values({
          termId: term.id,
          classId: classes[0].id,
          subjectId: otherSubject.id,
          catNumber: 1,
          maxMarks: 100,
          createdById: user.id,
        })
        .returning();
      await db.insert(s.catScores).values({
        catId: otherCat.id,
        studentId: learner.id,
        marksObtained: '80',
      });
      await db.insert(s.teacherSubjectAllocations).values({
        teacherId: subjectTeacher.id,
        classId: classes[0].id,
        subjectId: sub.id,
        academicYear: 2026,
      });
      await db.insert(s.markingAllocations).values({
        teacherId: subjectTeacher.id,
        classId: classes[1].id,
        subjectId: otherSubject.id,
        examId: exam.id,
      });
      const personal = await CatPerformanceService.getPerformance(
        { id: subjectTeacher.id, roleName: 'TEACHER' },
        { termId: term.id },
      );
      assert.equal(personal.scope, 'SUBJECT_TEACHER');
      assert.deepEqual(
        personal.filters.subjects.map((row) => row.id),
        [sub.id],
      );
      assert(
        personal.assessments.every(
          (row) => row.classId === classes[0].id && row.subjectId === sub.id,
        ),
      );
      await assert.rejects(
        () =>
          CatPerformanceService.getPerformance(
            { id: subjectTeacher.id, roleName: 'TEACHER' },
            { termId: term.id, classId: classes[1].id },
          ),
        /Choose a CAT cohort/,
      );
      await assert.rejects(
        () =>
          CatsService.getCatMarksheet(otherCat.id, {
            id: subjectTeacher.id,
            roleName: 'TEACHER',
          }),
        /access denied/,
      );
      const classView = await CatPerformanceService.getPerformance(
        { id: user.id, roleName: 'TEACHER' },
        { termId: term.id, classId: classes[0].id },
      );
      assert.equal(classView.scope, 'CLASS_TEACHER');
      assert.equal(classView.filters.subjects.length, 2);
      assert.equal(
        (
          await CatsService.getCatMarksheet(otherCat.id, {
            id: user.id,
            roleName: 'TEACHER',
          })
        ).learners.length,
        21,
      );
      const analysis = await DosService.getSubjectPerformance(
        exam.id,
        undefined,
        undefined,
        { id: subjectTeacher.id, roleName: 'DEPUTY_HEAD' } as any,
        'none',
      );
      assert.deepEqual(
        analysis.teacherAllocations.map((row) => [row.classId, row.subjectId]),
        [[classes[0].id, sub.id]],
      );
      await assert.rejects(
        () =>
          DosService.getSubjectPerformance(exam.id, undefined, undefined, {
            id: randomUUID(),
            roleName: 'DOS',
          } as any),
        /active teaching allocations/,
      );
      await assert.rejects(
        () =>
          DosService.setSubjectTargetMean(
            classes[0].id,
            sub.id,
            { examId: next.id, targetMeanPercentage: 60 },
            { id: subjectTeacher.id, roleName: 'DEPUTY_HEAD' } as any,
          ),
        /not been published/,
      );
      const studentInput = {
        firstName: 'Young',
        lastName: 'Learner',
        gender: 'FEMALE' as const,
        classId: classes[0].id,
        admissionDate: '2026-01-01',
      };
      const young = await AdmissionsService.admitStudent(
        studentInput,
        { existingGuardianId: guardian.id },
        user.id,
      );
      assert.equal(young.assessmentNumber, null);
      const young2 = await AdmissionsService.admitStudent(
        studentInput,
        { existingGuardianId: guardian.id },
        user.id,
      );
      assert.equal(young2.assessmentNumber, null);
      await assert.rejects(
        () =>
          AdmissionsService.admitStudent(
            { ...studentInput, classId: classes[1].id },
            { existingGuardianId: guardian.id },
            user.id,
          ),
        /Grade 4 and above/,
      );
      const admitted = await AdmissionsService.admitStudent(
        {
          ...studentInput,
          classId: classes[1].id,
          assessmentNumber: `KNEC-${suffix}`,
        },
        { existingGuardianId: guardian.id },
        user.id,
      );
      assert.equal(admitted.assessmentNumber, `KNEC-${suffix}`);
      const imported = await AdmissionsService.bulkImportStudents(
        [
          {
            ...studentInput,
            classId: classes[0].id,
            guardianFullName: 'Review',
            guardianPhoneNumber: suffix,
            guardianIdNumber: suffix,
          },
          {
            ...studentInput,
            classId: classes[0].id,
            guardianFullName: 'Review',
            guardianPhoneNumber: suffix,
            guardianIdNumber: suffix,
          },
          {
            ...studentInput,
            classId: classes[1].id,
            guardianFullName: 'Review',
            guardianPhoneNumber: suffix,
            guardianIdNumber: suffix,
          },
        ],
        user.id,
      );
      assert.equal(imported.insertedCount, 2);
      assert.equal(imported.errors.length, 1);
      assert.match(imported.errors[0], /Missing Assessment Number/);
    } finally {
      for (const key of methods) (db as any)[key] = saved.get(key);
      await client.end();
    }
  },
);
