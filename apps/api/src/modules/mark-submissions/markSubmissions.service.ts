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
  ne,
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

  /**
   * Generates a hierarchical class-by-class review summary for the Deputy Head.
   * Lists each class stream, assigned Class Teacher, and submission status of all subject papers.
   */
  static async getClassesReviewOverview(examId?: string) {
    // 1. Fetch all classes ordered by numericOrder
    const allClasses = await db
      .select({
        class: classes,
        classTeacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // 2. Fetch all subjects
    const allSubjects = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt))
      .orderBy(subjects.name);

    // 3. Fetch submissions matching examId (or all if not specified)
    const baseConditions = [isNull(markSubmissions.deletedAt)];
    if (examId) {
      baseConditions.push(eq(markSubmissions.examId, examId));
    }

    const submissions = await db
      .select({
        submission: markSubmissions,
        class: classes,
        subject: subjects,
        submittedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(markSubmissions)
      .innerJoin(classes, eq(markSubmissions.classId, classes.id))
      .innerJoin(subjects, eq(markSubmissions.subjectId, subjects.id))
      .innerJoin(users, eq(markSubmissions.teacherId, users.id))
      .where(and(...baseConditions));

    // Group submissions by classId
    const subMapByClass = new Map<string, any[]>();
    for (const s of submissions) {
      const arr = subMapByClass.get(s.class.id) || [];
      arr.push(s);
      subMapByClass.set(s.class.id, arr);
    }

    // 2b. Fetch teacher allocations (teacherSubjectAllocations & markingAllocations)
    const [regularAllocs, examMarkingAllocs] = await Promise.all([
      db
        .select({
          classId: teacherSubjectAllocations.classId,
          subjectId: teacherSubjectAllocations.subjectId,
          teacher: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phoneNumber: users.phoneNumber,
          },
        })
        .from(teacherSubjectAllocations)
        .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
        .where(isNull(teacherSubjectAllocations.deletedAt)),
      examId
        ? db
            .select({
              classId: markingAllocations.classId,
              subjectId: markingAllocations.subjectId,
              teacher: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                phoneNumber: users.phoneNumber,
              },
            })
            .from(markingAllocations)
            .innerJoin(users, eq(markingAllocations.teacherId, users.id))
            .where(
              and(
                eq(markingAllocations.examId, examId),
                isNull(markingAllocations.deletedAt)
              )
            )
        : Promise.resolve([]),
    ]);

    const allocMap = new Map<string, any>();
    for (const a of regularAllocs) {
      allocMap.set(`${a.classId}-${a.subjectId}`, a.teacher);
    }
    for (const ma of examMarkingAllocs) {
      allocMap.set(`${ma.classId}-${ma.subjectId}`, ma.teacher);
    }

    // Combine into class overview
    return allClasses.map(({ class: cls, classTeacher }) => {
      // Subjects for this class's levelCategory
      const classSubjects = allSubjects.filter(
        (sub) =>
          sub.levelCategory === cls.levelCategory ||
          (cls.levelCategory === 'PRIMARY' &&
            (sub.levelCategory === 'LOWER_PRIMARY' || sub.levelCategory === 'UPPER_PRIMARY'))
      );

      const classSubs = subMapByClass.get(cls.id) || [];
      const subMap = new Map<string, any>();
      classSubs.forEach((s) => subMap.set(s.subject.id, s));

      const papers = classSubjects.map((sub) => {
        const subData = subMap.get(sub.id);
        const allocatedTeacher = allocMap.get(`${cls.id}-${sub.id}`) || null;
        return {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          submissionId: subData?.submission?.id || null,
          status: subData?.submission?.status || 'NOT_STARTED',
          submittedBy: subData?.submittedBy || allocatedTeacher || null,
          allocatedTeacher: subData?.submittedBy || allocatedTeacher || null,
          submittedAt: subData?.submission?.submittedAt || null,
          reviewedAt: subData?.submission?.reviewedAt || null,
          correctionReason: subData?.submission?.correctionReason || null,
        };
      });

      const totalExpected = classSubjects.length;
      const lockedCount = papers.filter((p) => p.status === 'LOCKED').length;
      const approvedCount = papers.filter((p) => p.status === 'APPROVED').length;
      const underReviewCount = papers.filter((p) => p.status === 'UNDER_REVIEW').length;
      const submittedCount = papers.filter((p) => p.status === 'SUBMITTED').length;
      const correctionCount = papers.filter((p) => p.status === 'CORRECTION_REQUESTED').length;

      const isPermanentlyLocked = totalExpected > 0 && lockedCount === totalExpected;
      const isSubmittedToDeputy =
        totalExpected > 0 && (lockedCount + approvedCount + underReviewCount) === totalExpected;

      let overallStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'LOCKED' | 'CORRECTION_REQUESTED' = 'PENDING';
      if (isPermanentlyLocked) {
        overallStatus = 'LOCKED';
      } else if (isSubmittedToDeputy) {
        overallStatus = 'SUBMITTED';
      } else if (correctionCount > 0) {
        overallStatus = 'CORRECTION_REQUESTED';
      } else {
        overallStatus = 'PENDING';
      }

      return {
        class: cls,
        classTeacher: classTeacher?.id ? classTeacher : null,
        totalExpected,
        submittedCount,
        approvedCount,
        lockedCount,
        underReviewCount,
        correctionCount,
        overallStatus,
        isSubmittedToDeputy,
        isPermanentlyLocked,
        papers,
      };
    });
  }

  static async submitClassToDeputy(classId: string, examId: string, userId: string, userRole?: string) {
    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    const isClassTeacher = await LeaveRequestsService.isEffectiveClassTeacher(userId, classId);

    if (!isPrivileged && !isClassTeacher) {
      throw new Error('Only the assigned Class Teacher can submit the class marksheet to the Deputy Head');
    }

    const [cls] = await db.select().from(classes).where(and(eq(classes.id, classId), isNull(classes.deletedAt)));
    if (!cls) {
      throw new Error('Class stream not found');
    }

    const allSubjects = await db.select().from(subjects).where(isNull(subjects.deletedAt));
    const classSubjects = allSubjects.filter(
      (sub) =>
        sub.levelCategory === cls.levelCategory ||
        (cls.levelCategory === 'PRIMARY' &&
          (sub.levelCategory === 'LOWER_PRIMARY' || sub.levelCategory === 'UPPER_PRIMARY'))
    );

    const existingSubs = await db
      .select()
      .from(markSubmissions)
      .where(
        and(
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.examId, examId),
          isNull(markSubmissions.deletedAt)
        )
      );

    const subMap = new Map<string, any>();
    existingSubs.forEach((s) => subMap.set(s.subjectId, s));

    const missingSubjects = classSubjects.filter((s) => !subMap.has(s.id));
    if (missingSubjects.length > 0) {
      throw new Error(`Cannot submit to Deputy: ${missingSubjects.length} subject(s) have not been submitted yet.`);
    }

    const invalidSubs = existingSubs.filter(
      (s) => s.status === 'DRAFT' || s.status === 'CORRECTION_REQUESTED'
    );
    if (invalidSubs.length > 0) {
      throw new Error('Cannot submit to Deputy: All subjects must be submitted. Some subjects are still in draft or pending correction.');
    }

    const updated = await db
      .update(markSubmissions)
      .set({
        status: 'UNDER_REVIEW',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.examId, examId),
          ne(markSubmissions.status, 'LOCKED'),
          isNull(markSubmissions.deletedAt)
        )
      )
      .returning();

    return updated;
  }

  static async lockClassSubmissions(classId: string, examId: string, reviewedById: string, userRole?: string) {
    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    if (!isPrivileged) {
      throw new Error('Only the Deputy Head or Head Teacher is authorized to permanently lock class marksheets');
    }

    const updated = await db
      .update(markSubmissions)
      .set({
        status: 'LOCKED',
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.examId, examId),
          isNull(markSubmissions.deletedAt)
        )
      )
      .returning();

    return updated;
  }

  static async approveClassSubmissions(classId: string, examId: string, reviewedById: string) {
    const updated = await db
      .update(markSubmissions)
      .set({
        status: 'APPROVED',
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(markSubmissions.classId, classId),
          eq(markSubmissions.examId, examId),
          eq(markSubmissions.status, 'SUBMITTED'),
          isNull(markSubmissions.deletedAt)
        )
      )
      .returning();

    return updated;
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
      (cls.levelCategory === 'PPE' || cls.levelCategory === 'LOWER_PRIMARY' || cls.numericOrder <= 6)
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
    const isAllocatedSubjectTeacher = isPrivileged || (await this.verifyTeacherEligibility(examId, classId, subjectId, userId));
    const isClassTeacher = await LeaveRequestsService.isEffectiveClassTeacher(userId, classId);

    if (!isPrivileged && !isAllocatedSubjectTeacher && !isClassTeacher) {
      throw new Error('You are not authorized to view or enter marks for this class and subject');
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

    // If caller is Class Teacher (and NOT the allocated subject teacher and not privileged leadership)
    if (isClassTeacher && !isAllocatedSubjectTeacher && !isPrivileged) {
      if (
        currentStatus !== 'SUBMITTED' &&
        currentStatus !== 'APPROVED' &&
        currentStatus !== 'LOCKED' &&
        currentStatus !== 'CORRECTION_REQUESTED' &&
        !submission?.submittedAt
      ) {
        throw new Error('Subject teacher is currently marking. You can view marks once submitted.');
      }
    }

    // Only allocated subject teacher (or privileged leadership) can edit, and strictly only when draft (NOT when submitted, locked, or awaiting CT unlock)
    const canEdit =
      (isAllocatedSubjectTeacher || isPrivileged) &&
      (currentStatus === 'DRAFT' || !submission);

    // Fetch Class Teacher details (name & phone) to provide contact info to Subject Teacher
    let classTeacherInfo: { id: string; firstName: string; lastName: string; phoneNumber?: string | null } | null = null;
    if (targetClass.classTeacherId) {
      const [ctUser] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
        })
        .from(users)
        .where(eq(users.id, targetClass.classTeacherId));
      if (ctUser) {
        classTeacherInfo = {
          id: ctUser.id,
          firstName: ctUser.firstName,
          lastName: ctUser.lastName,
          phoneNumber: ctUser.phoneNumber || null,
        };
      }
    }

    // Fetch Assigned Marker details (name & phone) to provide contact info to Class Teacher
    let markerInfo: { id: string; firstName: string; lastName: string; phoneNumber?: string | null; email?: string | null } | null = null;
    if (submission?.teacherId) {
      const [subTeacher] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, submission.teacherId));
      if (subTeacher) {
        markerInfo = subTeacher;
      }
    }
    if (!markerInfo) {
      const [markingAlloc] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
          email: users.email,
        })
        .from(markingAllocations)
        .innerJoin(users, eq(markingAllocations.teacherId, users.id))
        .where(
          and(
            eq(markingAllocations.examId, examId),
            eq(markingAllocations.classId, classId),
            eq(markingAllocations.subjectId, subjectId),
            isNull(markingAllocations.deletedAt)
          )
        );
      if (markingAlloc) {
        markerInfo = markingAlloc;
      }
    }
    if (!markerInfo) {
      const [regularAlloc] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
          email: users.email,
        })
        .from(teacherSubjectAllocations)
        .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
        .where(
          and(
            eq(teacherSubjectAllocations.classId, classId),
            eq(teacherSubjectAllocations.subjectId, subjectId),
            isNull(teacherSubjectAllocations.deletedAt)
          )
        );
      if (regularAlloc) {
        markerInfo = regularAlloc;
      }
    }

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
      classTeacher: classTeacherInfo,
      marker: markerInfo,
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
            correctionReason: null,
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
   * Teacher request to Class Teacher for permission to correct submitted marks
   */
  static async requestCorrectionByTeacher(
    examId: string,
    classId: string,
    subjectId: string,
    reason: string | undefined,
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

    if (sub.status !== 'SUBMITTED' && sub.status !== 'LOCKED') {
      throw new Error(`Correction requests can only be sent for submitted marksheets (current: ${sub.status})`);
    }

    const note = reason?.trim() || `Correction requested by subject teacher (${new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })})`;
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'CORRECTION_REQUESTED',
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

  static async lockSubmission(id: string, reviewedById: string, userRole?: string) {
    const [sub] = await db.select().from(markSubmissions).where(eq(markSubmissions.id, id));
    if (!sub) {
      throw new Error('Marksheet submission not found');
    }

    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    const isClassTeacher = await LeaveRequestsService.isEffectiveClassTeacher(reviewedById, sub.classId);

    if (!isPrivileged && !isClassTeacher) {
      throw new Error('You are not authorized to regulate locking for this class marksheet');
    }

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

  static async unlockSubmission(id: string, reviewedById: string, userRole?: string) {
    const [sub] = await db.select().from(markSubmissions).where(eq(markSubmissions.id, id));
    if (!sub) {
      throw new Error('Marksheet submission not found');
    }

    const isPrivileged = userRole === 'HEAD_TEACHER' || userRole === 'DEPUTY_HEAD' || userRole === 'DOS';
    const isClassTeacher = await LeaveRequestsService.isEffectiveClassTeacher(reviewedById, sub.classId);

    if (!isPrivileged && !isClassTeacher) {
      throw new Error('You are not authorized to regulate locking for this class marksheet');
    }

    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'DRAFT',
        reviewedById,
        reviewedAt: new Date(),
        correctionReason: sub.correctionReason || 'UNLOCKED_FOR_CORRECTION',
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }
}
