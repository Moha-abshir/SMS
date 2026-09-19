import { db } from '../../config/db.js';
import {
  markSubmissions,
  classes,
  subjects,
  users,
  examinations,
  examScores,
  students,
  teacherSubjectAllocations,
  markingAllocations,
  calculateCbcRubric,
  calculateJuniorPoints,
  isJuniorSecondaryClass,
  eq,
  and,
  isNull,
  desc,
  sql,
} from '@school/shared';
import { LeaveRequestsService } from '../leave-requests/leaveRequests.service.js';

function computeGradeMetrics(marksObtained: number, maxMarks: number = 100, isJunior: boolean) {
  const percentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : marksObtained;
  if (isJunior) {
    const juniorPoints = calculateJuniorPoints(marksObtained, maxMarks);
    return { percentage, cbcRubricLevel: null, juniorPoints };
  } else {
    const rubricResult = calculateCbcRubric(marksObtained, maxMarks);
    return { percentage, cbcRubricLevel: rubricResult.code, juniorPoints: null };
  }
}

export class MarkSubmissionsService {
  static async getSubmissions(filterStatus?: string) {
    const list = await db
      .select({
        submission: markSubmissions,
        class: classes,
        subject: subjects,
        submittedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(markSubmissions)
      .innerJoin(classes, eq(markSubmissions.classId, classes.id))
      .innerJoin(subjects, eq(markSubmissions.subjectId, subjects.id))
      .innerJoin(users, eq(markSubmissions.teacherId, users.id))
      .where(isNull(markSubmissions.deletedAt))
      .orderBy(desc(markSubmissions.updatedAt));

    return list;
  }

  static async getSubmissionScores(id: string) {
    const [subData] = await db
      .select({
        submission: markSubmissions,
        class: classes,
        subject: subjects,
        examination: examinations,
        submittedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(markSubmissions)
      .innerJoin(classes, eq(markSubmissions.classId, classes.id))
      .innerJoin(subjects, eq(markSubmissions.subjectId, subjects.id))
      .innerJoin(examinations, eq(markSubmissions.examId, examinations.id))
      .innerJoin(users, eq(markSubmissions.teacherId, users.id))
      .where(eq(markSubmissions.id, id));

    if (!subData) {
      throw new Error('Marksheet submission not found');
    }

    // Fetch class students
    const classStudents = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.classId, subData.class.id),
          eq(students.status, 'ACTIVE'),
          isNull(students.deletedAt)
        )
      )
      .orderBy(students.firstName, students.lastName);

    // Fetch exam scores for this exam and subject
    const scores = await db
      .select()
      .from(examScores)
      .where(
        and(
          eq(examScores.examId, subData.submission.examId),
          eq(examScores.subjectId, subData.submission.subjectId)
        )
      );

    const scoresMap = new Map<string, any>();
    scores.forEach((s) => scoresMap.set(s.studentId, s));

    const isJunior = isJuniorSecondaryClass(subData.class);
    const gradingType: 'POINTS' | 'RUBRIC' = isJunior ? 'POINTS' : 'RUBRIC';

    let totalMarks = 0;
    let scoredCount = 0;
    let highestMark = 0;
    let lowestMark = 100;
    const rubricCount: Record<'EE' | 'ME' | 'AE' | 'BE', number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    const pointsCount: Record<number, number> = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const studentScores = classStudents.map((st) => {
      const sc = scoresMap.get(st.id);
      const markNum = sc ? parseFloat(sc.marksObtained) : null;
      let rubric: 'EE' | 'ME' | 'AE' | 'BE' | null = null;
      let points: number | null = null;

      if (markNum !== null) {
        totalMarks += markNum;
        scoredCount++;
        if (markNum > highestMark) highestMark = markNum;
        if (markNum < lowestMark) lowestMark = markNum;

        const maxMarks = sc?.maxMarks || 100;
        if (isJunior) {
          points = sc?.juniorPoints ?? calculateJuniorPoints(markNum, maxMarks);
          if (points !== null && points in pointsCount) {
            pointsCount[points]++;
          }
        } else {
          rubric = (sc?.cbcRubricLevel as 'EE' | 'ME' | 'AE' | 'BE') ?? calculateCbcRubric(markNum, maxMarks).code;
          if (rubric && rubric in rubricCount) {
            rubricCount[rubric]++;
          }
        }
      }

      return {
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        assessmentNumber: st.assessmentNumber,
        fullName: `${st.firstName} ${st.middleName || ''} ${st.lastName}`.replace(/\s+/g, ' ').trim(),
        studentName: `${st.firstName} ${st.middleName || ''} ${st.lastName}`.replace(/\s+/g, ' ').trim(),
        gender: st.gender,
        marksObtained: markNum,
        score: markNum,
        maxMarks: sc?.maxMarks || 100,
        maxScore: sc?.maxMarks || 100,
        percentage: markNum !== null ? Math.round(((markNum / (sc?.maxMarks || 100)) * 100) * 10) / 10 : 0,
        cbcRubricLevel: isJunior ? null : rubric,
        rubric: isJunior ? null : rubric,
        juniorPoints: isJunior ? points : null,
        points: isJunior ? points : null,
        teacherRemarks: sc?.teacherRemarks || '',
        remarks: sc?.teacherRemarks || '',
      };
    });

    const averageMark = scoredCount > 0 ? Math.round((totalMarks / scoredCount) * 10) / 10 : 0;

    return {
      submission: subData.submission,
      class: subData.class,
      subject: subData.subject,
      examination: subData.examination,
      submittedBy: subData.submittedBy,
      isJunior,
      gradingType,
      summary: {
        gradingType,
        isJunior,
        totalStudents: classStudents.length,
        scoredStudents: scoredCount,
        averageMark,
        averageScore: averageMark,
        highestMark: scoredCount > 0 ? highestMark : 0,
        highestScore: scoredCount > 0 ? highestMark : 0,
        lowestMark: scoredCount > 0 ? lowestMark : 0,
        lowestScore: scoredCount > 0 ? lowestMark : 0,
        rubricBreakdown: isJunior ? null : rubricCount,
        cbcPerformance: isJunior ? null : rubricCount,
        pointsBreakdown: isJunior ? pointsCount : null,
      },
      scores: studentScores,
    };
  }

  /**
   * Helper to verify if user has permission to enter/edit marks for this class & subject
   */
  static async verifyTeacherEligibility(
    examId: string,
    classId: string,
    subjectId: string,
    userId: string
  ): Promise<boolean> {
    const [user] = await db
      .select({
        id: users.id,
        roleId: users.roleId,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return false;

    // Check if class teacher of PPE / Lower Primary (Grades 1-3), including active standing-in teachers
    const [cls] = await db.select().from(classes).where(eq(classes.id, classId));
    if (
      cls &&
      (cls.levelCategory === 'PPE' || cls.levelCategory === 'LOWER_PRIMARY' || cls.numericOrder <= 3)
    ) {
      const isEffective = await LeaveRequestsService.isEffectiveClassTeacher(userId, classId);
      if (isEffective) return true;
    }

    // Check teacher_subject_allocations
    const [allocation] = await db
      .select()
      .from(teacherSubjectAllocations)
      .where(
        and(
          eq(teacherSubjectAllocations.classId, classId),
          eq(teacherSubjectAllocations.subjectId, subjectId),
          eq(teacherSubjectAllocations.teacherId, userId),
          isNull(teacherSubjectAllocations.deletedAt)
        )
      );
    if (allocation) return true;

    // Check marking_allocations
    const [marking] = await db
      .select()
      .from(markingAllocations)
      .where(
        and(
          eq(markingAllocations.examId, examId),
          eq(markingAllocations.classId, classId),
          eq(markingAllocations.subjectId, subjectId),
          eq(markingAllocations.teacherId, userId),
          isNull(markingAllocations.deletedAt)
        )
      );
    if (marking) return true;

    return false;
  }

  /**
   * Loads the mark entry sheet for a specific examination, class, and subject
   */
  static async getMarksheetEntry(
    examId: string,
    classId: string,
    subjectId: string,
    userId: string,
    userRole?: string
  ) {
    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    if (!isPrivileged) {
      const eligible = await this.verifyTeacherEligibility(examId, classId, subjectId, userId);
      if (!eligible) {
        throw new Error('You are not authorized to enter or modify marks for this class and subject');
      }
    }

    const [examination] = await db.select().from(examinations).where(eq(examinations.id, examId));
    if (!examination) throw new Error('Examination not found');

    const [targetClass] = await db.select().from(classes).where(eq(classes.id, classId));
    if (!targetClass) throw new Error('Class not found');

    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    if (!subject) throw new Error('Subject not found');

    // Fetch existing submission record if any
    const [submission] = await db
      .select()
      .from(markSubmissions)
      .where(
        and(
          eq(markSubmissions.examId, examId),
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.subjectId, subjectId)
        )
      );

    const currentStatus = submission?.status || 'DRAFT';
    const canEdit =
      currentStatus === 'DRAFT' ||
      currentStatus === 'CORRECTION_REQUESTED' ||
      !submission ||
      isPrivileged;

    // Fetch active students in class
    const classStudents = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.classId, classId),
          eq(students.status, 'ACTIVE'),
          isNull(students.deletedAt)
        )
      )
      .orderBy(students.firstName, students.lastName);

    // Fetch existing scores
    const scores = await db
      .select()
      .from(examScores)
      .where(
        and(
          eq(examScores.examId, examId),
          eq(examScores.subjectId, subjectId)
        )
      );

    const scoreMap = new Map<string, any>();
    scores.forEach((s) => scoreMap.set(s.studentId, s));

    const isJunior = isJuniorSecondaryClass(targetClass);
    const gradingType: 'POINTS' | 'RUBRIC' = isJunior ? 'POINTS' : 'RUBRIC';

    let totalMarks = 0;
    let scoredCount = 0;
    let highestMark = 0;
    let lowestMark = 100;
    const rubricCount: Record<'EE' | 'ME' | 'AE' | 'BE', number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    const pointsCount: Record<number, number> = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const studentRows = classStudents.map((st) => {
      const sc = scoreMap.get(st.id);
      const markNum = sc ? parseFloat(sc.marksObtained) : null;
      let rubric: 'EE' | 'ME' | 'AE' | 'BE' | null = null;
      let points: number | null = null;

      if (markNum !== null) {
        totalMarks += markNum;
        scoredCount++;
        if (markNum > highestMark) highestMark = markNum;
        if (markNum < lowestMark) lowestMark = markNum;

        const maxMarks = sc?.maxMarks || 100;
        if (isJunior) {
          points = sc?.juniorPoints ?? calculateJuniorPoints(markNum, maxMarks);
          if (points !== null && points in pointsCount) {
            pointsCount[points]++;
          }
        } else {
          rubric = (sc?.cbcRubricLevel as 'EE' | 'ME' | 'AE' | 'BE') ?? calculateCbcRubric(markNum, maxMarks).code;
          if (rubric && rubric in rubricCount) {
            rubricCount[rubric]++;
          }
        }
      }

      return {
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        assessmentNumber: st.assessmentNumber,
        fullName: `${st.firstName} ${st.middleName || ''} ${st.lastName}`.replace(/\s+/g, ' ').trim(),
        gender: st.gender,
        marksObtained: markNum,
        maxMarks: sc?.maxMarks || 100,
        cbcRubricLevel: isJunior ? null : rubric,
        juniorPoints: isJunior ? points : null,
        teacherRemarks: sc?.teacherRemarks || '',
      };
    });

    const averageMark = scoredCount > 0 ? Math.round((totalMarks / scoredCount) * 10) / 10 : 0;

    return {
      examination,
      class: targetClass,
      subject,
      submission: submission || null,
      status: currentStatus,
      correctionReason: submission?.correctionReason || null,
      canEdit,
      isJunior,
      gradingType,
      scores: studentRows,
      summary: {
        gradingType,
        isJunior,
        totalStudents: classStudents.length,
        scoredStudents: scoredCount,
        averageMark,
        highestMark: scoredCount > 0 ? highestMark : 0,
        lowestMark: scoredCount > 0 ? lowestMark : 0,
        rubricBreakdown: isJunior ? null : rubricCount,
        pointsBreakdown: isJunior ? pointsCount : null,
      },
    };
  }

  /**
   * Saves mark entry sheet as DRAFT without requiring all students to be filled
   */
  static async saveMarksheetDraft(
    examId: string,
    classId: string,
    subjectId: string,
    scores: Array<{
      studentId: string;
      marksObtained: number | string | null;
      maxMarks?: number;
      teacherRemarks?: string;
    }>,
    userId: string,
    userRole?: string
  ) {
    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    if (!isPrivileged) {
      const eligible = await this.verifyTeacherEligibility(examId, classId, subjectId, userId);
      if (!eligible) {
        throw new Error('You are not authorized to enter marks for this class and subject');
      }
    }

    // Check current submission status
    const [existingSub] = await db
      .select()
      .from(markSubmissions)
      .where(
        and(
          eq(markSubmissions.examId, examId),
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.subjectId, subjectId)
        )
      );

    if (existingSub && (existingSub.status === 'SUBMITTED' || existingSub.status === 'APPROVED' || existingSub.status === 'LOCKED')) {
      if (!isPrivileged) {
        throw new Error(`Cannot modify draft: marksheet is currently in '${existingSub.status}' status`);
      }
    }

    const [targetClass] = await db.select().from(classes).where(eq(classes.id, classId));
    const isJunior = isJuniorSecondaryClass(targetClass);

    await db.transaction(async (tx) => {
      // Upsert scores
      for (const item of scores) {
        if (item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== '') {
          const markNum = Math.max(0, Math.min(100, parseFloat(item.marksObtained as string)));
          const maxMarks = item.maxMarks || 100;
          const { cbcRubricLevel, juniorPoints } = computeGradeMetrics(markNum, maxMarks, isJunior);

          await tx
            .insert(examScores)
            .values({
              examId,
              studentId: item.studentId,
              subjectId,
              marksObtained: markNum.toFixed(2),
              maxMarks,
              cbcRubricLevel,
              juniorPoints,
              teacherRemarks: item.teacherRemarks || null,
              enteredById: userId,
            })
            .onConflictDoUpdate({
              target: [examScores.examId, examScores.studentId, examScores.subjectId],
              set: {
                marksObtained: markNum.toFixed(2),
                maxMarks,
                cbcRubricLevel,
                juniorPoints,
                teacherRemarks: item.teacherRemarks || null,
                enteredById: userId,
                updatedAt: new Date(),
              },
            });
        }
      }

      // Upsert submission record in DRAFT
      if (existingSub) {
        await tx
          .update(markSubmissions)
          .set({
            status: existingSub.status === 'CORRECTION_REQUESTED' ? 'CORRECTION_REQUESTED' : 'DRAFT',
            teacherId: userId,
            updatedAt: new Date(),
          })
          .where(eq(markSubmissions.id, existingSub.id));
      } else {
        await tx.insert(markSubmissions).values({
          examId,
          classId,
          subjectId,
          teacherId: userId,
          status: 'DRAFT',
        });
      }
    });

    return { success: true, message: 'Marksheet saved as draft successfully' };
  }

  /**
   * Submits marksheet for Deputy Head review. Requires all active learners to have scores.
   */
  static async submitMarksheet(
    examId: string,
    classId: string,
    subjectId: string,
    scores: Array<{
      studentId: string;
      marksObtained: number | string | null;
      maxMarks?: number;
      teacherRemarks?: string;
    }>,
    userId: string,
    userRole?: string
  ) {
    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    if (!isPrivileged) {
      const eligible = await this.verifyTeacherEligibility(examId, classId, subjectId, userId);
      if (!eligible) {
        throw new Error('You are not authorized to submit marks for this class and subject');
      }
    }

    // Verify all active students in class have scores
    const classStudents = await db
      .select({ id: students.id, name: students.firstName })
      .from(students)
      .where(
        and(
          eq(students.classId, classId),
          eq(students.status, 'ACTIVE'),
          isNull(students.deletedAt)
        )
      );

    const scoresMap = new Map<string, any>();
    scores.forEach((s) => scoresMap.set(s.studentId, s));

    const missingLearners = classStudents.filter((st) => {
      const scoreObj = scoresMap.get(st.id);
      return (
        !scoreObj ||
        scoreObj.marksObtained === null ||
        scoreObj.marksObtained === undefined ||
        scoreObj.marksObtained === ''
      );
    });

    if (missingLearners.length > 0) {
      throw new Error(
        `Cannot submit marksheet: All ${classStudents.length} active learners must have a recorded mark. Missing scores for ${missingLearners.length} learner(s).`
      );
    }

    const [targetClass] = await db.select().from(classes).where(eq(classes.id, classId));
    const isJunior = isJuniorSecondaryClass(targetClass);

    await db.transaction(async (tx) => {
      // Upsert all scores
      for (const item of scores) {
        const markNum = Math.max(0, Math.min(100, parseFloat(item.marksObtained as string)));
        const maxMarks = item.maxMarks || 100;
        const { cbcRubricLevel, juniorPoints } = computeGradeMetrics(markNum, maxMarks, isJunior);

        await tx
          .insert(examScores)
          .values({
            examId,
            studentId: item.studentId,
            subjectId,
            marksObtained: markNum.toFixed(2),
            maxMarks,
            cbcRubricLevel,
            juniorPoints,
            teacherRemarks: item.teacherRemarks || null,
            enteredById: userId,
          })
          .onConflictDoUpdate({
            target: [examScores.examId, examScores.studentId, examScores.subjectId],
            set: {
              marksObtained: markNum.toFixed(2),
              maxMarks,
              cbcRubricLevel,
              juniorPoints,
              teacherRemarks: item.teacherRemarks || null,
              enteredById: userId,
              updatedAt: new Date(),
            },
          });
      }

      // Transition submission to SUBMITTED
      const [existingSub] = await tx
        .select()
        .from(markSubmissions)
        .where(
          and(
            eq(markSubmissions.examId, examId),
            eq(markSubmissions.classId, classId),
            eq(markSubmissions.subjectId, subjectId)
          )
        );

      if (existingSub) {
        await tx
          .update(markSubmissions)
          .set({
            status: 'SUBMITTED',
            teacherId: userId,
            submittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(markSubmissions.id, existingSub.id));
      } else {
        await tx.insert(markSubmissions).values({
          examId,
          classId,
          subjectId,
          teacherId: userId,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });
      }
    });

    return {
      success: true,
      message: `Marksheet for ${classStudents.length} learners submitted successfully to the Deputy Head for review`,
    };
  }

  /**
   * Teacher request to Deputy for permission to correct submitted marks
   */
  static async requestCorrectionByTeacher(
    examId: string,
    classId: string,
    subjectId: string,
    reason: string,
    userId: string
  ) {
    const [sub] = await db
      .select()
      .from(markSubmissions)
      .where(
        and(
          eq(markSubmissions.examId, examId),
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.subjectId, subjectId)
        )
      );

    if (!sub) {
      throw new Error('Marksheet submission not found');
    }

    if (sub.status !== 'SUBMITTED') {
      throw new Error(`Correction requests can only be sent for 'SUBMITTED' marksheets (current: ${sub.status})`);
    }

    const note = `[Teacher Request - ${new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })}]: ${reason}`;
    const [updated] = await db
      .update(markSubmissions)
      .set({
        correctionReason: note,
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, sub.id))
      .returning();

    return updated;
  }

  static async approveSubmission(id: string, reviewedById: string) {
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'APPROVED',
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }

  static async requestCorrection(id: string, reason: string) {
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'CORRECTION_REQUESTED',
        correctionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }

  static async lockSubmission(id: string, reviewedById: string) {
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'LOCKED',
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }
}
