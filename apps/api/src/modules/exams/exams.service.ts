import { db } from '../../config/db.js';
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
  isNull,
  desc,
  count,
} from '@school/shared';

export class ExamsService {
  static async getExams() {
    const list = await db
      .select({
        exam: examinations,
        term: academicTerms,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(examinations.createdAt));

    return list;
  }

  static async createExam(data: { termId: string; title: string }) {
    const [created] = await db
      .insert(examinations)
      .values({
        termId: data.termId,
        title: data.title,
        status: 'DRAFT',
      })
      .returning();

    return created;
  }

  static async updateExam(id: string, data: { title?: string; termId?: string }) {
    const [existing] = await db
      .select()
      .from(examinations)
      .where(and(eq(examinations.id, id), isNull(examinations.deletedAt)));

    if (!existing) {
      throw new Error('Examination series not found');
    }

    if (existing.status === 'LOCKED') {
      throw new Error('Cannot edit a locked examination series.');
    }

    const updateFields: any = { updatedAt: new Date() };
    if (data.title && data.title.trim()) {
      updateFields.title = data.title.trim();
    }
    if (data.termId) {
      updateFields.termId = data.termId;
    }

    const [updated] = await db
      .update(examinations)
      .set(updateFields)
      .where(eq(examinations.id, id))
      .returning();

    return updated;
  }

  static async deleteExam(id: string) {
    const [existingExam] = await db
      .select()
      .from(examinations)
      .where(and(eq(examinations.id, id), isNull(examinations.deletedAt)));

    if (!existingExam) {
      throw new Error('Examination not found');
    }

    // Safeguard: Check if any mark submissions or exam scores exist for this exam
    const [submissionsCount] = await db
      .select({ total: count() })
      .from(markSubmissions)
      .where(and(eq(markSubmissions.examId, id), isNull(markSubmissions.deletedAt)));

    const [scoresCount] = await db
      .select({ total: count() })
      .from(examScores)
      .where(and(eq(examScores.examId, id), isNull(examScores.deletedAt)));

    if ((Number(submissionsCount?.total) || 0) > 0 || (Number(scoresCount?.total) || 0) > 0) {
      throw new Error(
        'Cannot delete this examination series because student scores or mark submissions are already recorded. Please archive or lock it instead.'
      );
    }

    // Soft delete child sessions
    await db
      .update(examSessions)
      .set({ deletedAt: new Date() })
      .where(eq(examSessions.examId, id));

    // Soft delete the exam
    const [deleted] = await db
      .update(examinations)
      .set({ deletedAt: new Date() })
      .where(eq(examinations.id, id))
      .returning();

    return deleted;
  }

  static async updateExamStatus(id: string, status: any) {
    const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED', 'RESUBMITTED', 'APPROVED', 'LOCKED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const [updated] = await db
      .update(examinations)
      .set({ status, updatedAt: new Date() })
      .where(eq(examinations.id, id))
      .returning();

    return updated;
  }

  static async getExamSessions(examId: string) {
    const sessions = await db
      .select({
        session: examSessions,
        subject: subjects,
      })
      .from(examSessions)
      .innerJoin(subjects, eq(examSessions.subjectId, subjects.id))
      .where(and(eq(examSessions.examId, examId), isNull(examSessions.deletedAt)))
      .orderBy(examSessions.sessionDate, examSessions.sessionTime);

    // Count assigned invigilators per session
    const invigAllocs = await db
      .select({
        sessionId: invigilatorAllocations.examSessionId,
      })
      .from(invigilatorAllocations)
      .where(isNull(invigilatorAllocations.deletedAt));

    const invigCountMap = new Map<string, number>();
    invigAllocs.forEach((a) => {
      invigCountMap.set(a.sessionId, (invigCountMap.get(a.sessionId) || 0) + 1);
    });

    return sessions.map((s) => ({
      ...s,
      invigilatorsCount: invigCountMap.get(s.session.id) || 0,
    }));
  }

  static async createExamSession(data: {
    examId: string;
    subjectId: string;
    sessionDate: string;
    sessionTime: string;
  }) {
    // Conflict check: is this exact subject already scheduled on the same date for this exam?
    const existing = await db
      .select()
      .from(examSessions)
      .where(
        and(
          eq(examSessions.examId, data.examId),
          eq(examSessions.subjectId, data.subjectId),
          eq(examSessions.sessionDate, data.sessionDate),
          isNull(examSessions.deletedAt)
        )
      );

    if (existing.length > 0) {
      throw new Error('This subject has already been scheduled for this date in the exam timetable.');
    }

    const [session] = await db
      .insert(examSessions)
      .values({
        examId: data.examId,
        subjectId: data.subjectId,
        sessionDate: data.sessionDate,
        sessionTime: data.sessionTime,
      })
      .returning();

    return session;
  }

  static async updateExamSession(
    id: string,
    data: {
      subjectId?: string;
      sessionDate?: string;
      sessionTime?: string;
    }
  ) {
    const [existing] = await db
      .select()
      .from(examSessions)
      .where(and(eq(examSessions.id, id), isNull(examSessions.deletedAt)));

    if (!existing) {
      throw new Error('Exam paper session not found');
    }

    const subjectId = data.subjectId || existing.subjectId;
    const sessionDate = data.sessionDate || existing.sessionDate;
    const sessionTime = data.sessionTime || existing.sessionTime;

    // Check conflict if subject or date changed
    if (subjectId !== existing.subjectId || sessionDate !== existing.sessionDate) {
      const conflict = await db
        .select()
        .from(examSessions)
        .where(
          and(
            eq(examSessions.examId, existing.examId),
            eq(examSessions.subjectId, subjectId),
            eq(examSessions.sessionDate, sessionDate),
            ne(examSessions.id, id),
            isNull(examSessions.deletedAt)
          )
        );

      if (conflict.length > 0) {
        throw new Error('This subject has already been scheduled for this date in the exam timetable.');
      }
    }

    const [updated] = await db
      .update(examSessions)
      .set({
        subjectId,
        sessionDate,
        sessionTime,
        updatedAt: new Date(),
      })
      .where(eq(examSessions.id, id))
      .returning();

    return updated;
  }

  static async deleteExamSession(id: string) {
    const [deleted] = await db
      .update(examSessions)
      .set({ deletedAt: new Date() })
      .where(eq(examSessions.id, id))
      .returning();

    return deleted;
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


