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

    // Get assigned invigilators per session
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
      .where(isNull(invigilatorAllocations.deletedAt));

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
      .where(and(eq(examinations.id, data.examId), isNull(examinations.deletedAt)));

    if (!exam) {
      throw new Error('Examination series not found');
    }

    // Parse weekday dates using local date components to prevent UTC shift
    const parseLocalDate = (dateStr: string) => {
      if (!dateStr || typeof dateStr !== 'string') return null;
      const parts = dateStr.trim().split('-');
      if (parts.length !== 3) return null;
      const [y, m, d] = parts.map(Number);
      if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
      const dt = new Date(y, m - 1, d);
      if (isNaN(dt.getTime())) return null;
      return dt;
    };
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const start = parseLocalDate(data.startDate);
    const end = parseLocalDate(data.endDate);
    if (!start || !end) {
      throw new Error('Valid start date and end date are required.');
    }
    if (start > end) {
      throw new Error('Start date must be before or equal to end date.');
    }

    const examDates: string[] = [];
    const curr = new Date(start);
    let dayGuard = 0;
    const MAX_DAYS = 60; // Hard watchdog limit: max 60 calendar days
    while (curr <= end && dayGuard < MAX_DAYS) {
      dayGuard++;
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        examDates.push(formatLocalDate(curr));
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (examDates.length === 0) {
      throw new Error('The exam period must include at least one weekday.');
    }

    const toMinutes = (timeStr: string) => {
      const [h, m] = (timeStr || '08:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const toTimeString = (minutes: number) => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const dayStartMin = toMinutes(data.dailyStartTime || '08:00');
    const dayEndMin = toMinutes(data.dailyEndTime || '15:30');

    // Sort breaks by start time
    const sortedBreaks = (data.breaks || [])
      .map((b) => ({
        name: b.name,
        startMin: toMinutes(b.startTime),
        endMin: toMinutes(b.endTime),
      }))
      .filter((b) => b.startMin >= dayStartMin && b.endMin <= dayEndMin && b.startMin < b.endMin)
      .sort((a, b) => a.startMin - b.startMin);

    // Compute non-break daily testing intervals
    const testingIntervals: Array<{ startMin: number; endMin: number; duration: number }> = [];
    let intervalStart = dayStartMin;

    for (const brk of sortedBreaks) {
      if (brk.startMin > intervalStart) {
        testingIntervals.push({
          startMin: intervalStart,
          endMin: brk.startMin,
          duration: brk.startMin - intervalStart,
        });
      }
      intervalStart = Math.max(intervalStart, brk.endMin);
    }
    if (intervalStart < dayEndMin) {
      testingIntervals.push({
        startMin: intervalStart,
        endMin: dayEndMin,
        duration: dayEndMin - intervalStart,
      });
    }

    if (testingIntervals.length === 0) {
      throw new Error('Daily schedule does not have any available testing time between start/end and breaks.');
    }

    // Fetch all active school classes (PP1 to Grade 9)
    const schoolClasses = await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // Soft delete existing sessions for this exam
    const existingSessions = await db
      .select({ id: examSessions.id })
      .from(examSessions)
      .where(and(eq(examSessions.examId, data.examId), isNull(examSessions.deletedAt)));

    if (existingSessions.length > 0) {
      await db
        .update(invigilatorAllocations)
        .set({ deletedAt: new Date() })
        .where(isNull(invigilatorAllocations.deletedAt));
      await db
        .update(examSessions)
        .set({ deletedAt: new Date() })
        .where(and(eq(examSessions.examId, data.examId), isNull(examSessions.deletedAt)));
    }

    let totalSessionsGenerated = 0;
    const targetClasses = schoolClasses.filter((c) => c.name.toLowerCase() !== 'playgroup');

    // For each class, schedule subjects
    for (const cls of targetClasses) {
      const classSubjects = await db
        .select()
        .from(subjects)
        .where(and(eq(subjects.levelCategory, cls.levelCategory), isNull(subjects.deletedAt)))
        .orderBy(subjects.name);

      if (classSubjects.length === 0) continue;

      let dateIdx = 0;
      let intervalIdx = 0;

      for (const subj of classSubjects) {
        let duration =
          data.gradeSubjectDurations?.[cls.name]?.[subj.id] ||
          data.gradeSubjectDurations?.[cls.levelCategory]?.[subj.id];

        if (!duration) {
          if (cls.levelCategory === 'PPE') duration = 45;
          else if (cls.levelCategory === 'LOWER_PRIMARY') duration = 60;
          else if (cls.levelCategory === 'UPPER_PRIMARY') duration = 80;
          else duration = 90;
        }

        if (intervalIdx >= testingIntervals.length) {
          intervalIdx = 0;
          dateIdx++;
        }

        const sessionDate = examDates[dateIdx % examDates.length];
        const block = testingIntervals[intervalIdx % testingIntervals.length];

        const slotStart = block.startMin;
        const slotEnd = Math.min(block.startMin + duration, block.endMin);
        const sessionTime = `${toTimeString(slotStart)} - ${toTimeString(slotEnd)}`;

        const [newSession] = await db
          .insert(examSessions)
          .values({
            examId: data.examId,
            classId: cls.id,
            subjectId: subj.id,
            sessionDate: sessionDate,
            sessionTime: sessionTime,
            durationMinutes: duration,
          })
          .returning();

        totalSessionsGenerated++;

        const invigilatorId = data.classInvigilators?.[cls.id];
        if (invigilatorId) {
          await db.insert(invigilatorAllocations).values({
            examSessionId: newSession.id,
            classId: cls.id,
            teacherId: invigilatorId,
          });
        }

        intervalIdx++;
      }
    }

    return {
      success: true,
      sessionsCount: totalSessionsGenerated,
      classesCount: targetClasses.length,
      examDates,
    };
  }

  static async swapExamSessions(sessionAId: string, sessionBId: string) {
    const [sessA] = await db
      .select({
        session: examSessions,
        subject: subjects,
      })
      .from(examSessions)
      .innerJoin(subjects, eq(examSessions.subjectId, subjects.id))
      .where(and(eq(examSessions.id, sessionAId), isNull(examSessions.deletedAt)));

    const [sessB] = await db
      .select({
        session: examSessions,
        subject: subjects,
      })
      .from(examSessions)
      .innerJoin(subjects, eq(examSessions.subjectId, subjects.id))
      .where(and(eq(examSessions.id, sessionBId), isNull(examSessions.deletedAt)));

    if (!sessA || !sessB) {
      throw new Error('One or both examination sessions could not be found.');
    }

    if (sessA.session.classId !== sessB.session.classId) {
      throw new Error('Cannot swap exams between different classes. Timetables are class-independent.');
    }

    const durA = sessA.session.durationMinutes || 60;
    const durB = sessB.session.durationMinutes || 60;

    if (durA !== durB) {
      throw new Error(
        `Duration Mismatch: Cannot swap ${sessA.subject.name} (${durA} mins) with ${sessB.subject.name} (${durB} mins). Exams can only be moved between slots with matching duration.`
      );
    }

    await db
      .update(examSessions)
      .set({
        sessionDate: sessB.session.sessionDate,
        sessionTime: sessB.session.sessionTime,
        updatedAt: new Date(),
      })
      .where(eq(examSessions.id, sessionAId));

    await db
      .update(examSessions)
      .set({
        sessionDate: sessA.session.sessionDate,
        sessionTime: sessA.session.sessionTime,
        updatedAt: new Date(),
      })
      .where(eq(examSessions.id, sessionBId));

    return {
      success: true,
      message: `Successfully swapped ${sessA.subject.name} and ${sessB.subject.name}`,
    };
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


