import type { AuthenticatedUser } from '../../middleware/auth.js';
import { randomUUID } from 'node:crypto';
import { parseISO, format, isWeekend, eachDayOfInterval } from 'date-fns';
import { db } from '../../config/db.js';
import { lockExamSchedule, validatePaperEdits } from './examScheduling.js';
import {
  validateExamSchedule,
  examTestingIntervals,
  examTimeLabel,
  examTimeRange,
  type ExamScheduleConfig,
} from '@school/shared';
import {
  examinations,
  examSessions,
  academicTerms,
  subjects,
  invigilatorAllocations,
  classes,
  students,
  users,
  teacherSubjectAllocations,
  markSubmissions,
  examScores,
  eq,
  and,
  ne,
  inArray,
  isNull,
  desc,
  count,
  sql,
} from '@school/shared';

export class ExamsService {
  static async getExams(actor?: Pick<AuthenticatedUser, 'roleName'>, publishedOnly = false) {
    const list = await db
      .select({
        exam: examinations,
        term: academicTerms,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(and(isNull(examinations.deletedAt), actor?.roleName === 'DOS' && !publishedOnly ? undefined : inArray(examinations.status, ['APPROVED', 'LOCKED'])))
      .orderBy(desc(examinations.createdAt));

    return list;
  }

  static async createExam(data: { termId: string; title: string; startDate?: string; endDate?: string }) {
    const [created] = await db
      .insert(examinations)
      .values({
        termId: data.termId,
        title: data.title,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        status: 'DRAFT',
      })
      .returning();

    return created;
  }

  static async updateExam(
    id: string,
    data: {
      title?: string;
      termId?: string;
      startDate?: string;
      endDate?: string;
      scheduleConfig?: ExamScheduleConfig;
    },
  ) {
    return db.transaction(async (tx) => {
      const existing = await lockExamSchedule(tx, id);
      const fields: Partial<typeof examinations.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (data.title !== undefined) {
        if (!data.title.trim())
          throw new Error('Examination title is required');
        fields.title = data.title.trim();
      }
      if (data.termId) fields.termId = data.termId;
      if (data.startDate !== undefined)
        fields.startDate = data.startDate || null;
      if (data.endDate !== undefined) fields.endDate = data.endDate || null;
      if (data.scheduleConfig !== undefined)
        fields.scheduleConfig = validateExamSchedule(data.scheduleConfig);
      if (
        existing.status === 'APPROVED' &&
        (data.scheduleConfig !== undefined ||
          data.startDate !== undefined ||
          data.endDate !== undefined)
      ) {
        const papers = await tx
          .select()
          .from(examSessions)
          .where(
            and(eq(examSessions.examId, id), isNull(examSessions.deletedAt)),
          );
        await validatePaperEdits(
          tx,
          { ...existing, ...fields } as typeof existing,
          papers,
          papers.map((row) => row.id),
        );
      }
      const [updated] = await tx
        .update(examinations)
        .set(fields)
        .where(eq(examinations.id, id))
        .returning();
      return updated;
    });
  }

  static async deleteExam(id: string) {
    return db.transaction(async (tx) => {
      await lockExamSchedule(tx, id);
      const [existingExam] = await tx
        .select()
        .from(examinations)
        .where(and(eq(examinations.id, id), isNull(examinations.deletedAt)));

      if (!existingExam) {
        throw new Error('Examination not found');
      }

      // Safeguard: Check if any mark submissions or exam scores exist for this exam
      const [submissionsCount] = await tx
        .select({ total: count() })
        .from(markSubmissions)
        .where(
          and(
            eq(markSubmissions.examId, id),
            isNull(markSubmissions.deletedAt),
          ),
        );

      const [scoresCount] = await tx
        .select({ total: count() })
        .from(examScores)
        .where(and(eq(examScores.examId, id), isNull(examScores.deletedAt)));

      if (
        (Number(submissionsCount?.total) || 0) > 0 ||
        (Number(scoresCount?.total) || 0) > 0
      ) {
        throw new Error(
          'Cannot delete this examination series because student scores or mark submissions are already recorded. Please archive or lock it instead.',
        );
      }

      // Soft delete child sessions
      await tx
        .update(examSessions)
        .set({ deletedAt: new Date() })
        .where(eq(examSessions.examId, id));

      // Soft delete the exam
      const [deleted] = await tx
        .update(examinations)
        .set({ deletedAt: new Date() })
        .where(eq(examinations.id, id))
        .returning();

      return deleted;
    });
  }

  static async updateExamStatus(id: string, status: unknown) {
    if (status !== 'DRAFT' && status !== 'APPROVED' && status !== 'LOCKED')
      throw new Error(
        'Use Draft, Published or Concluded for an examination timetable.',
      );
    if (status === 'LOCKED') {
      await this.terminateExamPeriod(id);
      const [closed] = await db.select().from(examinations).where(eq(examinations.id, id));
      return closed;
    }
    return db.transaction(async (tx) => {
      const exam = await lockExamSchedule(tx, id);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`exam-lifecycle:${id}`}, 0))`);
      if (status === 'APPROVED') {
        validateExamSchedule(exam.scheduleConfig);
        const papers = await tx
          .select()
          .from(examSessions)
          .where(
            and(eq(examSessions.examId, id), isNull(examSessions.deletedAt)),
          );
        if (!papers.length)
          throw new Error('Schedule examination papers before publishing.');
        await validatePaperEdits(
          tx,
          exam,
          papers,
          papers.map((row) => row.id),
        );
      }
      const [updated] = await tx
        .update(examinations)
        .set({ status, updatedAt: new Date() })
        .where(eq(examinations.id, id))
        .returning();
      return updated;
    });
  }

  static async terminationReadiness(examId: string, reader: Pick<typeof db, 'select'> = db) {
    const [exam] = await reader.select().from(examinations).where(and(eq(examinations.id, examId), isNull(examinations.deletedAt)));
    if (!exam) throw new Error('Examination series not found');
    const papers = await reader.select({ classId: examSessions.classId, subjectId: examSessions.subjectId })
      .from(examSessions).where(and(eq(examSessions.examId, examId), isNull(examSessions.deletedAt)));
    const submissions = await reader.select().from(markSubmissions)
      .where(and(eq(markSubmissions.examId, examId), isNull(markSubmissions.deletedAt)));
    const byPair = new Map(submissions.map(row => [`${row.classId}:${row.subjectId}`, row]));
    const pending = new Set<string>();
    for (const paper of papers) {
      if (!paper.classId) continue;
      const submission = byPair.get(`${paper.classId}:${paper.subjectId}`);
      if (!submission?.forwardedToDeputyAt || !['LOCKED', 'APPROVED'].includes(submission.status)) pending.add(paper.classId);
    }
    const canConclude = exam.status === 'APPROVED' && papers.some(paper => paper.classId) && pending.size === 0;
    const reason = exam.status === 'LOCKED' ? 'This examination has already concluded.'
      : exam.status !== 'APPROVED' ? 'Publish the examination before concluding it.'
      : !papers.length ? 'Schedule and publish examination papers first.'
      : pending.size ? `Waiting for ${pending.size} class marksheet(s) to be forwarded to the Deputy Head.`
      : 'All class marksheets have been forwarded to the Deputy Head.';
    return { canConclude, reason, pendingClassIds: [...pending] };
  }

  static async terminateExamPeriod(examId?: string) {
    if (!examId) throw new Error('Select the examination to conclude.');
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('exam-timetable-edit',0))`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`exam-lifecycle:${examId}`}, 0))`);
      const readiness = await this.terminationReadiness(examId, tx);
      if (!readiness.canConclude) throw new Error(readiness.reason);
      await tx.update(examinations).set({ status: 'LOCKED', updatedAt: new Date() }).where(eq(examinations.id, examId));
    });
    return { success: true, message: 'Examination concluded. It cannot be reopened.' };
  }

  static async activateExamPeriod(
    _examId?: string,
  ): Promise<{ success: boolean; message: string }> {
    throw new Error(
      'Examination periods cannot be reactivated. Create and publish a new examination instead.',
    );
  }

  static async getExamSessions(examId: string, classId?: string) {
    const whereConditions = [
      eq(examSessions.examId, examId),
      isNull(examSessions.deletedAt),
    ];
    if (classId) {
      whereConditions.push(eq(examSessions.classId, classId));
    }

    const sessions = await db
      .select({
        session: examSessions,
        subject: subjects,
        class: classes,
      })
      .from(examSessions)
      .innerJoin(subjects, eq(examSessions.subjectId, subjects.id))
      .leftJoin(classes, eq(examSessions.classId, classes.id))
      .where(and(...whereConditions))
      .orderBy(examSessions.sessionDate, examSessions.sessionTime);

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.session.id);

    // Get assigned invigilators per session (filtered to the current class/exam sessions)
    const invigAllocs = await db
      .select({
        sessionId: invigilatorAllocations.examSessionId,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(invigilatorAllocations)
      .innerJoin(users, eq(invigilatorAllocations.teacherId, users.id))
      .where(
        and(
          inArray(invigilatorAllocations.examSessionId, sessionIds),
          isNull(invigilatorAllocations.deletedAt),
        ),
      );

    const invigMap = new Map<string, any>();
    invigAllocs.forEach((a) => {
      invigMap.set(a.sessionId, a.teacher);
    });

    return sessions.map((s) => ({
      ...s,
      invigilator: invigMap.get(s.session.id) || null,
      invigilatorsCount: invigMap.has(s.session.id) ? 1 : 0,
    }));
  }

  static async generateExamTimetable(data: {
    examId: string;
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    dailyEndTime: string;
    breaks: Array<{ name: string; startTime: string; endTime: string }>;
    gradeSubjectDurations?: Record<string, Record<string, number>>;
    classInvigilators?: Record<string, string>;
  }) {
    const [exam] = await db
      .select()
      .from(examinations)
      .where(
        and(eq(examinations.id, data.examId), isNull(examinations.deletedAt)),
      );

    if (!exam) {
      throw new Error('Examination series not found');
    }

    if (exam.status === 'LOCKED')
      throw new Error(
        'This examination has concluded and cannot be regenerated.',
      );
    const scheduleConfig = validateExamSchedule({
      dailyStartTime: data.dailyStartTime,
      dailyEndTime: data.dailyEndTime,
      breaks: data.breaks,
    });

    // Parse and validate start/end dates using date-fns
    const start = parseISO(data.startDate);
    const end = parseISO(data.endDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Valid start date and end date are required.');
    }
    if (start > end) {
      throw new Error('Start date must be before or equal to end date.');
    }

    if (end.getTime() - start.getTime() > 366 * 86400_000)
      throw new Error('Examination date range must not exceed one year');
    // Extract all weekdays across the exam date interval using date-fns
    const allDays = eachDayOfInterval({ start, end });
    const examDates = allDays
      .filter((d) => !isWeekend(d))
      .map((d) => format(d, 'yyyy-MM-dd'));

    if (examDates.length === 0) {
      throw new Error('The exam period must include at least one weekday.');
    }

    const testingIntervals = examTestingIntervals(scheduleConfig);
    if (!testingIntervals.length)
      throw new Error('Examination hours must include time outside breaks.');

    // Fetch all active school classes (PP1 to Grade 9)
    const schoolClasses = await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // Soft delete existing sessions for this exam
    let totalSessionsGenerated = 0;
    const plannedSessions: Array<typeof examSessions.$inferInsert> = [];
    const plannedInvigilators: Array<
      typeof invigilatorAllocations.$inferInsert
    > = [];
    const allSubjects = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt))
      .orderBy(subjects.name);
    const targetClasses = schoolClasses.filter(
      (c) => c.name.toLowerCase() !== 'playgroup',
    );

    // Fit every full paper into a testing window. Shared invigilators are booked
    // across classes; papers never wrap back onto an occupied date or cross breaks.
    const bookings = new Map<string, Array<{ start: number; end: number }>>();
    const book = (key: string, range: { start: number; end: number }) => {
      if (!bookings.has(key)) bookings.set(key, []);
      bookings.get(key)!.push(range);
    };
    for (const cls of targetClasses) {
      const classSubjects = allSubjects.filter(
        (subject) => subject.levelCategory === cls.levelCategory,
      );
      for (const subj of classSubjects) {
        const duration =
          data.gradeSubjectDurations?.[cls.name]?.[subj.id] ??
          data.gradeSubjectDurations?.[cls.levelCategory]?.[subj.id] ??
          (cls.levelCategory === 'PPE'
            ? 45
            : cls.levelCategory === 'LOWER_PRIMARY'
              ? 60
              : cls.levelCategory === 'UPPER_PRIMARY'
                ? 80
                : 90);
        if (!Number.isInteger(duration) || duration <= 0 || duration > 1440)
          throw new Error('Invalid examination duration');
        const invigilatorId = data.classInvigilators?.[cls.id];
        let placement: { date: string; start: number; end: number } | null =
          null;
        for (const date of examDates) {
          for (const window of testingIntervals) {
            let start = window.start;
            const busy = [
              ...(bookings.get(`class:${cls.id}:${date}`) || []),
              ...(invigilatorId
                ? bookings.get(`teacher:${invigilatorId}:${date}`) || []
                : []),
            ].sort((a, b) => a.start - b.start);
            for (const occupied of busy) {
              if (start + duration <= occupied.start) break;
              if (start < occupied.end && start + duration > occupied.start)
                start = occupied.end;
            }
            if (start + duration <= window.end) {
              placement = { date, start, end: start + duration };
              break;
            }
          }
          if (placement) break;
        }
        if (!placement)
          throw new Error(
            `Not enough examination time for ${subj.name} in ${cls.name}. Extend the period or adjust hours, breaks or invigilators.`,
          );
        const id = randomUUID();
        plannedSessions.push({
          id,
          examId: data.examId,
          classId: cls.id,
          subjectId: subj.id,
          sessionDate: placement.date,
          sessionTime: `${examTimeLabel(placement.start)} - ${examTimeLabel(placement.end)}`,
          durationMinutes: duration,
        });
        book(`class:${cls.id}:${placement.date}`, placement);
        if (invigilatorId) {
          book(`teacher:${invigilatorId}:${placement.date}`, placement);
          plannedInvigilators.push({
            examSessionId: id,
            classId: cls.id,
            teacherId: invigilatorId,
          });
        }
        totalSessionsGenerated++;
      }
    }

    await db.transaction(async (tx) => {
      const freshExam = await lockExamSchedule(tx, data.examId);
      const previous = await tx
        .select({ id: examSessions.id })
        .from(examSessions)
        .where(
          and(
            eq(examSessions.examId, data.examId),
            isNull(examSessions.deletedAt),
          ),
        );
      await validatePaperEdits(
        tx,
        {
          ...freshExam,
          startDate: data.startDate,
          endDate: data.endDate,
          scheduleConfig,
        },
        plannedSessions as Array<typeof examSessions.$inferSelect>,
        previous.map((row) => row.id),
        plannedInvigilators as Array<
          typeof invigilatorAllocations.$inferSelect
        >,
      );
      if (previous.length) {
        await tx
          .update(invigilatorAllocations)
          .set({ deletedAt: new Date() })
          .where(
            and(
              inArray(
                invigilatorAllocations.examSessionId,
                previous.map((session) => session.id),
              ),
              isNull(invigilatorAllocations.deletedAt),
            ),
          );
        await tx
          .update(examSessions)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(examSessions.examId, data.examId),
              isNull(examSessions.deletedAt),
            ),
          );
      }
      for (let offset = 0; offset < plannedSessions.length; offset += 500)
        await tx
          .insert(examSessions)
          .values(plannedSessions.slice(offset, offset + 500));
      for (let offset = 0; offset < plannedInvigilators.length; offset += 500)
        await tx
          .insert(invigilatorAllocations)
          .values(plannedInvigilators.slice(offset, offset + 500));
      await tx
        .update(examinations)
        .set({
          startDate: data.startDate,
          endDate: data.endDate,
          scheduleConfig,
          updatedAt: new Date(),
        })
        .where(eq(examinations.id, data.examId));
    });

    return {
      success: true,
      sessionsCount: totalSessionsGenerated,
      classesCount: targetClasses.length,
      examDates,
    };
  }

  static async swapExamSessions(sessionAId: string, sessionBId: string) {
    if (sessionAId === sessionBId)
      throw new Error('Choose two different papers.');
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('exam-timetable-edit',0))`,
      );
      const rows = await tx
        .select()
        .from(examSessions)
        .where(
          and(
            inArray(examSessions.id, [sessionAId, sessionBId]),
            isNull(examSessions.deletedAt),
          ),
        );
      const a = rows.find((row) => row.id === sessionAId),
        b = rows.find((row) => row.id === sessionBId);
      if (!a || !b)
        throw new Error('One or both examination papers were not found.');
      if (a.examId !== b.examId || a.classId !== b.classId)
        throw new Error(
          'Only papers in the same examination and class can be swapped.',
        );
      const exam = await lockExamSchedule(tx, a.examId);
      const durationA =
        a.durationMinutes ??
        examTimeRange(a.sessionTime).end - examTimeRange(a.sessionTime).start;
      const durationB =
        b.durationMinutes ??
        examTimeRange(b.sessionTime).end - examTimeRange(b.sessionTime).start;
      if (durationA !== durationB)
        throw new Error('Papers must have the same duration to swap.');
      const nextA = {
        ...a,
        sessionDate: b.sessionDate,
        sessionTime: b.sessionTime,
      };
      const nextB = {
        ...b,
        sessionDate: a.sessionDate,
        sessionTime: a.sessionTime,
      };
      await validatePaperEdits(tx, exam, [nextA, nextB], [a.id, b.id]);
      await tx
        .update(examSessions)
        .set({
          sessionDate: nextA.sessionDate,
          sessionTime: nextA.sessionTime,
          updatedAt: new Date(),
        })
        .where(eq(examSessions.id, a.id));
      await tx
        .update(examSessions)
        .set({
          sessionDate: nextB.sessionDate,
          sessionTime: nextB.sessionTime,
          updatedAt: new Date(),
        })
        .where(eq(examSessions.id, b.id));
      return { success: true, message: 'Examination papers swapped.' };
    });
  }

  static async createExamSession(data: {
    examId: string;
    classId: string;
    subjectId: string;
    sessionDate: string;
    sessionTime: string;
    durationMinutes?: number;
  }) {
    return db.transaction(async (tx) => {
      const exam = await lockExamSchedule(tx, data.examId);
      if (!data.classId)
        throw new Error('A class is required for an examination paper.');
      const range = examTimeRange(data.sessionTime);
      const paper = {
        id: randomUUID(),
        examId: data.examId,
        classId: data.classId,
        subjectId: data.subjectId,
        sessionDate: data.sessionDate,
        sessionTime: data.sessionTime,
        durationMinutes: data.durationMinutes ?? range.end - range.start,
      };
      await validatePaperEdits(tx, exam, [paper], []);
      const [created] = await tx.insert(examSessions).values(paper).returning();
      return created;
    });
  }

  static async updateExamSession(
    id: string,
    data: { subjectId?: string; sessionDate?: string; sessionTime?: string },
  ) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('exam-timetable-edit',0))`,
      );
      const [paper] = await tx
        .select()
        .from(examSessions)
        .where(and(eq(examSessions.id, id), isNull(examSessions.deletedAt)));
      if (!paper) throw new Error('Exam paper session not found');
      const exam = await lockExamSchedule(tx, paper.examId);
      if (data.subjectId && data.subjectId !== paper.subjectId)
        throw new Error(
          'Change the schedule of this paper without changing its learning area.',
        );
      const updated = {
        ...paper,
        sessionDate: data.sessionDate ?? paper.sessionDate,
        sessionTime: data.sessionTime ?? paper.sessionTime,
      };
      await validatePaperEdits(tx, exam, [updated], [id]);
      const [result] = await tx
        .update(examSessions)
        .set({
          sessionDate: updated.sessionDate,
          sessionTime: updated.sessionTime,
          updatedAt: new Date(),
        })
        .where(eq(examSessions.id, id))
        .returning();
      return result;
    });
  }

  static async deleteExamSession(id: string) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('exam-timetable-edit',0))`,
      );
      const [paper] = await tx
        .select()
        .from(examSessions)
        .where(and(eq(examSessions.id, id), isNull(examSessions.deletedAt)));
      if (!paper) throw new Error('Exam paper session not found');
      await lockExamSchedule(tx, paper.examId);
      const [deleted] = await tx
        .update(examSessions)
        .set({ deletedAt: new Date() })
        .where(eq(examSessions.id, id))
        .returning();
      return deleted;
    });
  }

  static async getExamProgress(examId: string) {
    const [examWithTerm] = await db
      .select({
        exam: examinations,
        term: academicTerms,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(and(eq(examinations.id, examId), isNull(examinations.deletedAt)));

    if (!examWithTerm) {
      throw new Error('Examination not found');
    }

    const academicYear = examWithTerm.term.year;

    // 1. Get all active classes
    const allClasses = await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder, classes.name);

    // 2. Count active students per class
    const studentCounts = await db
      .select({
        classId: students.classId,
        total: count(students.id),
      })
      .from(students)
      .where(and(eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .groupBy(students.classId);

    const studentCountMap = new Map<string, number>();
    studentCounts.forEach((s) => {
      if (s.classId) studentCountMap.set(s.classId, Number(s.total) || 0);
    });

    // 3. Get all teacherSubjectAllocations for this academic year
    const rawAllocations = await db
      .select({
        classId: teacherSubjectAllocations.classId,
        subjectId: teacherSubjectAllocations.subjectId,
        teacherId: teacherSubjectAllocations.teacherId,
        firstName: users.firstName,
        lastName: users.lastName,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        levelCategory: subjects.levelCategory,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(subjects, eq(teacherSubjectAllocations.subjectId, subjects.id))
      .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
      .where(
        and(
          eq(teacherSubjectAllocations.academicYear, academicYear),
          isNull(teacherSubjectAllocations.deletedAt)
        )
      );

    const allocations = rawAllocations.map((a) => ({
      classId: a.classId,
      subjectId: a.subjectId,
      teacherId: a.teacherId,
      teacherName: `${a.firstName} ${a.lastName}`.trim(),
      subjectName: a.subjectName,
      subjectCode: a.subjectCode,
      levelCategory: a.levelCategory,
    }));

    // Also fetch all subjects to handle classes without explicit allocations (e.g. Lower Primary)
    const allSubjects = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt));

    // 4. Get all mark submissions for this exam
    const rawSubmissions = await db
      .select({
        id: markSubmissions.id,
        classId: markSubmissions.classId,
        subjectId: markSubmissions.subjectId,
        teacherId: markSubmissions.teacherId,
        status: markSubmissions.status,
        submittedAt: markSubmissions.submittedAt,
        correctionReason: markSubmissions.correctionReason,
        updatedAt: markSubmissions.updatedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(markSubmissions)
      .innerJoin(users, eq(markSubmissions.teacherId, users.id))
      .where(and(eq(markSubmissions.examId, examId), isNull(markSubmissions.deletedAt)));

    const submissions = rawSubmissions.map((s) => ({
      ...s,
      teacherName: `${s.firstName} ${s.lastName}`.trim(),
    }));

    const submissionMap = new Map<string, (typeof submissions)[0]>();
    submissions.forEach((sub) => {
      submissionMap.set(`${sub.classId}_${sub.subjectId}`, sub);
    });

    // 5. Get score counts per (classId, subjectId) for this exam
    const scoreCounts = await db
      .select({
        classId: students.classId,
        subjectId: examScores.subjectId,
        total: count(examScores.id),
      })
      .from(examScores)
      .innerJoin(students, eq(examScores.studentId, students.id))
      .where(and(eq(examScores.examId, examId), isNull(examScores.deletedAt)))
      .groupBy(students.classId, examScores.subjectId);

    const scoreCountMap = new Map<string, number>();
    scoreCounts.forEach((sc) => {
      if (sc.classId && sc.subjectId) {
        scoreCountMap.set(`${sc.classId}_${sc.subjectId}`, Number(sc.total) || 0);
      }
    });

    // Build mapping of class allocations
    const classAllocMap = new Map<string, typeof allocations>();
    allocations.forEach((alloc) => {
      const list = classAllocMap.get(alloc.classId) || [];
      list.push(alloc);
      classAllocMap.set(alloc.classId, list);
    });

    let totalExpected = 0;
    let submittedCount = 0;
    let approvedCount = 0;
    let underReviewCount = 0;
    let correctionRequestedCount = 0;
    let notStartedCount = 0;

    const classProgress = allClasses.map((cls) => {
      const totalStudents = studentCountMap.get(cls.id) || 0;
      let expectedSubjectsForClass: Array<{
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        teacherId?: string;
        teacherName?: string;
      }> = [];

      const existingAllocs = classAllocMap.get(cls.id) || [];
      if (existingAllocs.length > 0) {
        expectedSubjectsForClass = existingAllocs.map((a) => ({
          subjectId: a.subjectId,
          subjectName: a.subjectName,
          subjectCode: a.subjectCode,
          teacherId: a.teacherId,
          teacherName: a.teacherName,
        }));
      } else {
        // Fallback: match subjects by class.levelCategory
        const matching = allSubjects.filter(
          (s) => s.levelCategory === cls.levelCategory || s.levelCategory === 'PRIMARY'
        );
        expectedSubjectsForClass = matching.map((s) => ({
          subjectId: s.id,
          subjectName: s.name,
          subjectCode: s.code,
          teacherId: undefined,
          teacherName: undefined,
        }));
      }

      let classSubmitted = 0;
      let classApproved = 0;

      const subjectsDetail = expectedSubjectsForClass.map((subj) => {
        totalExpected++;
        const subKey = `${cls.id}_${subj.subjectId}`;
        const submission = submissionMap.get(subKey);
        const scoresCount = scoreCountMap.get(subKey) || 0;

        let status = submission ? submission.status : 'NOT_STARTED';
        if (!submission && scoresCount > 0) {
          status = 'DRAFT';
        }

        if (['SUBMITTED', 'RESUBMITTED'].includes(status)) {
          submittedCount++;
          classSubmitted++;
        } else if (status === 'UNDER_REVIEW') {
          underReviewCount++;
          submittedCount++;
          classSubmitted++;
        } else if (['APPROVED', 'LOCKED'].includes(status)) {
          approvedCount++;
          submittedCount++;
          classSubmitted++;
          classApproved++;
        } else if (status === 'CORRECTION_REQUESTED') {
          correctionRequestedCount++;
        } else {
          notStartedCount++;
        }

        return {
          subjectId: subj.subjectId,
          subjectName: subj.subjectName,
          subjectCode: subj.subjectCode,
          teacherId: submission?.teacherId || subj.teacherId || null,
          teacherName: submission?.teacherName || subj.teacherName || 'Unassigned',
          scoresCount,
          totalStudents,
          status,
          submittedAt: submission?.submittedAt || null,
          updatedAt: submission?.updatedAt || null,
          correctionReason: submission?.correctionReason || null,
        };
      });

      const totalSubjects = expectedSubjectsForClass.length;
      const classCompletionPercentage =
        totalSubjects > 0 ? Math.round((classSubmitted / totalSubjects) * 100) : 0;

      return {
        classId: cls.id,
        className: cls.name,
        levelCategory: cls.levelCategory,
        numericOrder: cls.numericOrder,
        totalStudents,
        totalSubjects,
        submittedSubjects: classSubmitted,
        approvedSubjects: classApproved,
        classCompletionPercentage,
        subjects: subjectsDetail,
      };
    });

    const completionPercentage =
      totalExpected > 0 ? Math.round((submittedCount / totalExpected) * 100) : 0;

    return {
      exam: {
        id: examWithTerm.exam.id,
        title: examWithTerm.exam.title,
        status: examWithTerm.exam.status,
        termNumber: examWithTerm.term.termNumber,
        year: examWithTerm.term.year,
      },
      summary: {
        totalExpected,
        submittedCount,
        approvedCount,
        underReviewCount,
        correctionRequestedCount,
        notStartedCount,
        pendingCount: totalExpected - submittedCount,
        completionPercentage,
      },
      classes: classProgress,
    };
  }
}


