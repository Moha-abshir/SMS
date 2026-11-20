import { AllocationsService } from '../src/modules/allocations/allocations.service.js';
import { ExamsService } from '../src/modules/exams/exams.service.js';
import { AdmissionsService } from '../src/modules/admissions/admissions.service.js';
import { StaffService } from '../src/modules/staff/staff.service.js';
import { TeacherService } from '../src/modules/teacher/teacher.service.js';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { FinanceService } from '../src/modules/finance/finance.service.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import * as schema from '@school/shared';
import { db } from '../src/config/db.js';
import { CatsService } from '../src/modules/cats/cats.service.js';
import { MarkSubmissionsService } from '../src/modules/mark-submissions/markSubmissions.service.js';

// Schema must be installed in a disposable database. Never use application credentials here.
test('CAT object scopes, learner membership, marks locks and concurrent transitions', { skip: !process.env.SECURITY_TEST_DATABASE_URL, timeout: 30_000 }, async () => {
  const client = postgres(process.env.SECURITY_TEST_DATABASE_URL!, { max: 4, connection: { statement_timeout: 10_000, lock_timeout: 10_000 } });
  let queries = 0;
  const local = schema.drizzle(client, { logger: { logQuery() { queries++; } } });
  const methods = ['select','insert','update','delete','execute','transaction'] as const;
  const saved = new Map(methods.map(key => [key, db[key]]));
  for (const key of methods) (db as any)[key] = (local[key] as Function).bind(local);
  const suffix = randomUUID().slice(0, 8);
  try {
    const [role] = await db.insert(schema.roles).values({ name: `TEST_${suffix}` }).returning();
    const makeUser = async (label: string) => (await db.insert(schema.users).values({ email: `${label}${suffix}@example.test`, passwordHash: 'test-only', firstName: label, lastName: 'Test', nationalId: label+suffix, phoneNumber: label+suffix, roleId: role.id }).returning())[0];
    const teacher = await makeUser('teacher'), outsider = await makeUser('outsider');
    const actor = { id: teacher.id, roleName: 'TEACHER' } as any;
    const other = { id: outsider.id, roleName: 'TEACHER' } as any;
    const leader = { id: teacher.id, roleName: 'HEAD_TEACHER' } as any;
    const [cls] = await db.insert(schema.classes).values({ name: `Grade 9 ${suffix}`, numericOrder: 12, levelCategory: 'JUNIOR', classTeacherId: teacher.id }).returning();
    const [subject] = await db.insert(schema.subjects).values({ name: 'Math', code: suffix, levelCategory: 'JUNIOR' }).returning();
    await db.insert(schema.teacherSubjectAllocations).values({ academicYear: 2080, classId: cls.id, subjectId: subject.id, teacherId: teacher.id });
    const [{ nextYear }] = await db.select({ nextYear: schema.sql<number>`coalesce(max(${schema.academicTerms.year}), 2079)::int + 1` }).from(schema.academicTerms);
    const [term] = await db.insert(schema.academicTerms).values({ year: nextYear, termNumber: 1, startDate: '2080-01-01', endDate: '2080-04-01' }).returning();
    const [guardian] = await db.insert(schema.guardians).values({ fullName: 'Test', phoneNumber: suffix, idNumber: suffix }).returning();
    const [learner] = await db.insert(schema.students).values({ assessmentNumber: suffix, firstName: 'Learner', lastName: 'Test', gender: 'MALE', classId: cls.id, primaryGuardianId: guardian.id, admissionDate: '2080-01-01', status: 'ACTIVE' }).returning();
    const cat = await CatsService.createCat(teacher.id, { classId: cls.id, subjectId: subject.id, catNumber: 1, termId: term.id }, actor);
    // More simultaneous requests than pool connections must not borrow a second connection while holding a transaction.
    await Promise.all([2,3,4,5,6,7].map(catNumber => CatsService.createCat(teacher.id, { classId: cls.id, subjectId: subject.id, catNumber, termId: term.id }, actor)));
    await assert.rejects(() => CatsService.getCatMarksheet(cat.id, other), /access denied/);
    await assert.rejects(() => CatsService.getClassCatsDetail(cls.id, other, term.id), /access denied/);
    await assert.rejects(() => CatsService.deleteCat(cat.id, outsider.id, other), /access denied/);
    await assert.rejects(() => CatsService.saveCatScores(cat.id, teacher.id, { scores: [{ studentId: outsider.id, marksObtained: 50 }] }, actor), /outside/);
    await CatsService.saveCatScores(cat.id, teacher.id, { scores: [{ studentId: learner.id, marksObtained: 0 }] }, actor);
    assert.equal((await CatsService.getCatMarksheet(cat.id, actor)).learners.length, 1);
    await assert.rejects(() => CatsService.getCatMarksheet(cat.id, { ...other, roleName: 'BURSAR' }), /access denied/);
    const [exam] = await db.insert(schema.examinations).values({ termId: term.id, title: 'Test' }).returning();
    const more = await db.insert(schema.students).values(Array.from({ length: 29 }, (_, i) => ({ assessmentNumber: `${suffix}-${i}`, firstName: 'Learner', lastName: 'Test', gender: 'MALE' as const, classId: cls.id, primaryGuardianId: guardian.id, admissionDate: '2080-01-01', status: 'ACTIVE' as const }))).returning();
    const scores = [learner, ...more].map(row => ({ studentId: row.id, marksObtained: 75 }));
    let before = queries;
    await MarkSubmissionsService.saveMarksheetDraft(exam.id, cls.id, subject.id, scores.slice(0,1), teacher.id, 'HEAD_TEACHER');
    const oneLearnerQueries = queries-before;
    before = queries;
    await MarkSubmissionsService.saveMarksheetDraft(exam.id, cls.id, subject.id, scores, teacher.id, 'HEAD_TEACHER');
    const thirtyLearnerQueries = queries-before;
    assert.equal(thirtyLearnerQueries, oneLearnerQueries);
    await Promise.all(Array.from({ length: 12 }, () => MarkSubmissionsService.saveMarksheetDraft(exam.id, cls.id, subject.id, scores, teacher.id, 'TEACHER')));

    console.log(`Draft SQL count: 1 learner=${oneLearnerQueries}; 30 learners=${thirtyLearnerQueries}`);
    const [sub] = await db.select().from(schema.markSubmissions).where(schema.eq(schema.markSubmissions.examId, exam.id));
    await MarkSubmissionsService.lockSubmission(sub.id, teacher.id, 'HEAD_TEACHER');
    await assert.rejects(() => MarkSubmissionsService.saveMarksheetDraft(exam.id, cls.id, subject.id, scores, teacher.id, 'HEAD_TEACHER'), /Cannot modify/);
    await assert.rejects(() => MarkSubmissionsService.submitMarksheet(exam.id, cls.id, subject.id, scores, teacher.id, 'HEAD_TEACHER'), /unlock/);
    await assert.rejects(() => MarkSubmissionsService.approveSubmission(sub.id, teacher.id), /unlock/);
    await MarkSubmissionsService.unlockSubmission(sub.id, teacher.id, 'HEAD_TEACHER');
    await MarkSubmissionsService.submitMarksheet(exam.id, cls.id, subject.id, scores, teacher.id, 'HEAD_TEACHER');
    await MarkSubmissionsService.requestCorrectionByTeacher(exam.id, cls.id, subject.id, 'Test', teacher.id);
    await assert.rejects(() => MarkSubmissionsService.saveMarksheetDraft(exam.id, cls.id, subject.id, scores, teacher.id, 'HEAD_TEACHER'), /Cannot modify/);
    await MarkSubmissionsService.unlockSubmission(sub.id, teacher.id, 'HEAD_TEACHER');
    const outcomes = await Promise.allSettled([1,2].map(() => MarkSubmissionsService.submitMarksheet(exam.id, cls.id, subject.id, scores, teacher.id, 'HEAD_TEACHER')));
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
    const paymentInput = { studentId: learner.id, amountPaid: 10, paymentMethod: 'CASH' as const, paidBy: 'Test', academicYear: term.year, termNumber: 1 };
    const payments = await Promise.all([10,20].map(amountPaid => FinanceService.recordPayment({ ...paymentInput, amountPaid }, teacher.id)));
    assert.notEqual(payments[0].receiptNumber, payments[1].receiptNumber);
    const [bill] = await db.select().from(schema.studentBills).where(schema.eq(schema.studentBills.id, payments[0].billId!));
    assert.equal(Number(bill.paidAmount), 30);
    const reversal = await FinanceService.requestReversal(payments[0].id, 'Test', teacher.id);
    const reversed = await Promise.allSettled([1,2].map(() => FinanceService.approveReversal(reversal.id, teacher.id)));
    assert.equal(reversed.filter(r => r.status === 'fulfilled').length, 1);
    const [afterReversal] = await db.select().from(schema.studentBills).where(schema.eq(schema.studentBills.id, bill.id));
    assert.equal(Number(afterReversal.paidAmount), 20);
    const referenced = { ...paymentInput, amountPaid: 50, paymentMethod: 'MANUAL_MPESA' as const, mpesaRefCode: `REF${suffix}` };
    const retried = await Promise.all([1,2].map(() => FinanceService.recordPayment(referenced, teacher.id)));
    assert.equal(retried[0].id, retried[1].id);
    await assert.rejects(() => FinanceService.recordPayment({ ...referenced, amountPaid: 51 }, teacher.id), /reference/);
    const [afterRetry] = await db.select().from(schema.studentBills).where(schema.eq(schema.studentBills.id, bill.id));
    assert.equal(Number(afterRetry.paidAmount), 70);

    const outsiderOverview = await MarkSubmissionsService.getClassesReviewOverview(exam.id, other);
    assert.equal(outsiderOverview.length, 0);
    await assert.rejects(() => MarkSubmissionsService.getSubmissionScores(sub.id, other), /access denied/);
    await assert.rejects(() => TeacherService.getClassLearners(outsider.id, cls.id, other), /access denied/);
    await assert.rejects(() => TeacherService.getLearnerPerformance(learner.id, other), /access denied/);
    await assert.rejects(() => TeacherService.sendLearnerControlledSms(learner.id, 'ACADEMIC_PROGRESS', undefined, other), /access denied/);
    const importRow = { assessmentNumber: `IM${suffix}`, firstName: 'Imported', lastName: 'Learner', gender: 'MALE', className: cls.name,
      admissionDate: '2080-01-01', guardianFullName: 'Imported Parent', guardianPhoneNumber: '0700000000', guardianIdNumber: `P${suffix}` };
    const imported = await AdmissionsService.bulkImportStudents([importRow, { ...importRow, assessmentNumber: `IM2${suffix}` }], teacher.id);
    assert.equal(imported.insertedCount, 2);
    const importedChildren = await db.select().from(schema.students).where(schema.inArray(schema.students.assessmentNumber, [`IM${suffix}`, `IM2${suffix}`]));
    assert.equal(importedChildren[0].primaryGuardianId, importedChildren[1].primaryGuardianId);
    await assert.rejects(() => AdmissionsService.bulkImportStudents([{ ...importRow, assessmentNumber: `BAD${suffix}`, guardianIdNumber: `ROLLBACK${suffix}`, admissionDate: 'invalid' }], teacher.id));
    assert.equal((await db.select().from(schema.guardians).where(schema.eq(schema.guardians.idNumber, `ROLLBACK${suffix}`))).length, 0);
    const [otherExam] = await db.insert(schema.examinations).values({ termId: term.id, title: 'Unrelated exam' }).returning();
    const [otherSession] = await db.insert(schema.examSessions).values({ examId: otherExam.id, classId: cls.id, subjectId: subject.id, sessionDate: '2080-01-22', sessionTime: '08:00 - 09:00', durationMinutes: 60 }).returning();
    const [otherInvigilator] = await db.insert(schema.invigilatorAllocations).values({ examSessionId: otherSession.id, classId: cls.id, teacherId: teacher.id }).returning();
    const examSchedule = { examId: exam.id, startDate: '2080-01-08', endDate: '2080-01-12', dailyStartTime: '08:00', dailyEndTime: '16:00', breaks: [], classInvigilators: { [cls.id]: teacher.id } };
    await ExamsService.generateExamTimetable(examSchedule);
    await ExamsService.generateExamTimetable(examSchedule);
    const [untouched] = await db.select().from(schema.invigilatorAllocations).where(schema.eq(schema.invigilatorAllocations.id, otherInvigilator.id));
    assert.equal(untouched.deletedAt, null);
    const [lower] = await db.insert(schema.classes).values({ name: `Grade 3 ${suffix}`, numericOrder: 6, levelCategory: 'LOWER_PRIMARY' }).returning();
    await db.insert(schema.subjects).values({ name: 'Lower Math', code: `LM${suffix}`, levelCategory: 'LOWER_PRIMARY' });
    await AllocationsService.assignClassTeacher(lower.id, teacher.id, term.year);
    const lowerBefore = await db.select().from(schema.teacherSubjectAllocations).where(schema.and(schema.eq(schema.teacherSubjectAllocations.classId, lower.id), schema.isNull(schema.teacherSubjectAllocations.deletedAt)));
    assert(lowerBefore.length > 0);
    await AllocationsService.assignClassTeacher(lower.id, outsider.id, term.year);
    await AllocationsService.assignClassTeacher(lower.id, teacher.id, term.year);
    const lowerAfter = await db.select().from(schema.teacherSubjectAllocations).where(schema.and(schema.eq(schema.teacherSubjectAllocations.classId, lower.id), schema.isNull(schema.teacherSubjectAllocations.deletedAt)));
    assert.equal(lowerAfter.length, lowerBefore.length);
    assert(lowerAfter.every(row => row.teacherId === teacher.id));
    await AllocationsService.assignClassTeacher(lower.id, null, term.year);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const port = (server.address() as any).port;
      const token = jwt.sign({ ...other, email: outsider.email, tokenVersion: 1, permissions: [] }, env.JWT_SECRET, { expiresIn: '5m' });
      const response = await fetch(`http://127.0.0.1:${port}/api/cats/${cat.id}/marksheet`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const denied = await fetch(`http://127.0.0.1:${port}/api/mark-submissions/${sub.id}/scores`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(denied.status, 403);
      const escalation = await fetch(`http://127.0.0.1:${port}/api/staff/${outsider.id}`, {
        method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ roleId: role.id }),
      });
      assert.equal(escalation.status, 403);
      for (const path of [`/api/attendance/classes/${cls.id}/register`, '/api/attendance/school-wide', '/api/leave-requests', '/api/inventory/checkouts', '/api/admissions/guardians/search?q=test', '/api/admissions/students', '/api/staff']) {
        const blocked = await fetch(`http://127.0.0.1:${port}${path}`, { headers: { authorization: `Bearer ${token}` } });
        assert.equal(blocked.status, 403, path);
      }
      const wrongClassWrite = await fetch(`http://127.0.0.1:${port}/api/attendance/classes/${cls.id}/register`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ date: '2080-01-01', records: [] }),
      });
      assert.equal(wrongClassWrite.status, 403);
      const secretaryToken = jwt.sign({ ...other, roleName: 'SECRETARY', email: outsider.email, tokenVersion: 1, permissions: [] }, env.JWT_SECRET, { expiresIn: '5m' });
      const privilegedInvitation = await fetch(`http://127.0.0.1:${port}/api/staff/invitations`, {
        method: 'POST', headers: { authorization: `Bearer ${secretaryToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ roleId: role.id }),
      });
      assert.equal(privilegedInvitation.status, 403);
      const invalidLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'invalid', password: '' }) });
      assert.equal(invalidLogin.status, 400);
      assert(Array.isArray((await invalidLogin.json() as any).errors));
      await db.update(schema.users).set({ twoFactorOtp: '123456', twoFactorExpiresAt: new Date(Date.now()+60_000) }).where(schema.eq(schema.users.id, outsider.id));
      const verifications = await Promise.all([1,2].map(() => fetch(`http://127.0.0.1:${port}/api/auth/verify-2fa`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: outsider.email, otp: '123456' }),
      })));
      assert.equal(verifications.filter(r => r.status === 200).length, 1);
      const dosToken = jwt.sign({ ...other, roleName: 'DOS', email: outsider.email, tokenVersion: 1, permissions: [] }, env.JWT_SECRET, { expiresIn: '5m' });
      const directoryResponse = await fetch(`http://127.0.0.1:${port}/api/staff`, { headers: { authorization: `Bearer ${dosToken}` } });
      assert.equal(directoryResponse.status, 200);
      const directory = (await directoryResponse.json() as any).data;
      assert(directory.length > 0);
      assert(!('salaryAmount' in directory[0]));
      assert(!('nationalId' in directory[0]));

      const unchanged = await StaffService.updateStaff(outsider.id, { ...outsider, roleId: role.id });
      assert(unchanged && !('passwordHash' in unchanged) && !('twoFactorOtp' in unchanged));
      const [sameIdentity] = await db.select().from(schema.users).where(schema.eq(schema.users.id, outsider.id));
      assert.equal(sameIdentity.tokenVersion, 1);
      const [newRole] = await db.insert(schema.roles).values({ name: `CHANGED_${suffix}` }).returning();
      await StaffService.updateStaff(outsider.id, { ...outsider, roleId: newRole.id });
      const oldSession = await fetch(`http://127.0.0.1:${port}/api/cats/${cat.id}/marksheet`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(oldSession.status, 401);



    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
    const [leave] = await db.insert(schema.teacherLeaveRequests).values({ teacherId: teacher.id, leaveType: 'PERSONAL', startDate: '2080-01-01', endDate: '2080-01-02', reason: 'Test', status: 'APPROVED', notes: JSON.stringify({ standingInTeacherId: outsider.id }) }).returning();
    await assert.rejects(() => TeacherService.assertClassAccess(other, cls.id), /access denied/);
    await db.update(schema.teacherLeaveRequests).set({ startDate: '2020-01-01' }).where(schema.eq(schema.teacherLeaveRequests.id, leave.id));
    await TeacherService.assertClassAccess(other, cls.id);
    await db.update(schema.teacherLeaveRequests).set({ notes: JSON.stringify({ standingInTeacherId: outsider.id, isReturned: true }) }).where(schema.eq(schema.teacherLeaveRequests.id, leave.id));
    await assert.rejects(() => TeacherService.assertClassAccess(other, cls.id), /access denied/);
    console.log(`Academic integration fixture: ${queries} SQL statements across all checks`);
  } finally {
    for (const [key,value] of saved) (db as any)[key] = value;
    await client.end();
  }
});
