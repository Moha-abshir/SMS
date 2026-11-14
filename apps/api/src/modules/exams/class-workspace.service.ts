import { db } from '../../config/db.js';
import {
  classes,
  examinations,
  academicTerms,
  students,
  examScores,
  subjects,
  teacherSubjectAllocations,
  users,
  markSubmissions,
  catAssessments,
  catScores,
  reportCardLocks,
  reportUnlockRequests,
  reportCardRemarks,
  classExamTargets,
  attendanceRegisters,
  attendanceRecords,
  teacherLeaveRequests,
  eq,
  and,
  isNull,
  desc,
  inArray,
  sql,
} from '@school/shared';
import { LeaveRequestsService } from '../leave-requests/leaveRequests.service.js';
import {
  SchoolwideOverviewService,
  getPrimaryRubric,
  getJuniorPointScale,
  isJuniorGrade,
} from './schoolwide-overview.service.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export interface ClassWorkspaceUserScope {
  isLeadership: boolean;
  isAssignedClassTeacher: boolean;
  assignedClassId: string | null;
}

export class ClassWorkspaceService {
  /**
   * Resolves whether the user has permission to view this class workspace.
   */
  static async resolveUserScope(user?: AuthenticatedUser, targetClassId?: string): Promise<ClassWorkspaceUserScope> {
    if (!user) {
      return { isLeadership: false, isAssignedClassTeacher: false, assignedClassId: null };
    }

    const leadershipRoles = ['HEAD_TEACHER', 'DOS', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'ADMIN'];
    const isLeadership = leadershipRoles.includes(user.roleName);

    // Check direct class teacher assignment
    const assignedClass = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.classTeacherId, user.id), isNull(classes.deletedAt)))
      .limit(1);

    let assignedClassId = assignedClass.length > 0 ? assignedClass[0].id : null;

    // Check stand-in delegation if no direct assignment
    if (!assignedClassId) {
      try {
        const delegation = await LeaveRequestsService.getActiveStandInDelegationForTeacher(user.id);
        if (delegation?.assignedClass) {
          assignedClassId = delegation.assignedClass.id;
        }
      } catch (e) {
        // proceed if delegation check fails
      }
    }

    const isAssignedClassTeacher = assignedClassId !== null && (targetClassId ? assignedClassId === targetClassId : true);

    return {
      isLeadership,
      isAssignedClassTeacher,
      assignedClassId,
    };
  }

  /**
   * Retrieves full Class Workspace data
   */
  static async getClassWorkspace(
    classId: string,
    examId?: string,
    compareExamId?: string,
    user?: AuthenticatedUser
  ) {
    // 1. Authorization check
    const userScope = await this.resolveUserScope(user, classId);
    if (!userScope.isLeadership && !userScope.isAssignedClassTeacher) {
      const err: any = new Error('Access denied: You are not assigned as the Class Teacher for this grade.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Resolve exam chronology
    const { selectedExam, compareExam, availableExams } = await SchoolwideOverviewService.resolveExams(
      examId,
      compareExamId
    );

    if (!selectedExam) {
      const err: any = new Error('No examinations found in the system.');
      err.statusCode = 404;
      throw err;
    }

    // 3. Resolve target class
    const targetClassRows = await db
      .select({
        id: classes.id,
        name: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
        classTeacherId: classes.classTeacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)));

    if (targetClassRows.length === 0) {
      const err: any = new Error('Specified class was not found.');
      err.statusCode = 404;
      throw err;
    }

    const targetClass = targetClassRows[0];
    const isJunior = isJuniorGrade(targetClass);

    // 4. Resolve all classes (for navigation dropdown)
    const allDbClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        levelCategory: classes.levelCategory,
      })
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // 5. Fetch all enrolled active learners in this class
    const enrolledStudents = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        assessmentNumber: students.assessmentNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        gender: students.gender,
      })
      .from(students)
      .where(
        and(
          eq(students.classId, classId),
          isNull(students.deletedAt),
          eq(students.status, 'ACTIVE')
        )
      )
      .orderBy(students.admissionNumber);

    const studentIds = enrolledStudents.map((s) => s.id);

    // 6. Fetch subjects allocated to this class
    const subjectAllocations = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherId: users.id,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(subjects, eq(teacherSubjectAllocations.subjectId, subjects.id))
      .leftJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
      .where(
        and(
          eq(teacherSubjectAllocations.classId, classId),
          isNull(teacherSubjectAllocations.deletedAt),
          isNull(subjects.deletedAt)
        )
      );

    // If no explicit allocations, fallback to subjects that have scores for this exam
    let classSubjects = subjectAllocations.map((sa) => ({
      id: sa.subjectId,
      name: sa.subjectName,
      code: sa.subjectCode,
      teacherName: sa.teacherFirstName ? `${sa.teacherFirstName} ${sa.teacherLastName}` : 'Unallocated',
      teacherId: sa.teacherId || null,
    }));

    if (classSubjects.length === 0) {
      const distinctExamSubjects = await db
        .selectDistinct({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        })
        .from(examScores)
        .innerJoin(subjects, eq(examScores.subjectId, subjects.id))
        .where(
          and(
            eq(examScores.examId, selectedExam.id),
            studentIds.length > 0 ? inArray(examScores.studentId, studentIds) : sql`1=0`,
            isNull(examScores.deletedAt)
          )
        );

      classSubjects = distinctExamSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        teacherName: 'Assigned Staff',
        teacherId: null,
      }));
    }

    const classSubjectIds = classSubjects.map((s) => s.id);

    // 7. Fetch current exam scores
    const currentScores = studentIds.length > 0 && classSubjectIds.length > 0
      ? await db
          .select({
            studentId: examScores.studentId,
            subjectId: examScores.subjectId,
            marksObtained: examScores.marksObtained,
            cbcRubricLevel: examScores.cbcRubricLevel,
            juniorPoints: examScores.juniorPoints,
            teacherRemarks: examScores.teacherRemarks,
          })
          .from(examScores)
          .where(
            and(
              eq(examScores.examId, selectedExam.id),
              inArray(examScores.studentId, studentIds),
              isNull(examScores.deletedAt)
            )
          )
      : [];

    // 8. Fetch baseline comparison scores
    const baselineScores = compareExam && studentIds.length > 0
      ? await db
          .select({
            studentId: examScores.studentId,
            subjectId: examScores.subjectId,
            marksObtained: examScores.marksObtained,
            cbcRubricLevel: examScores.cbcRubricLevel,
            juniorPoints: examScores.juniorPoints,
          })
          .from(examScores)
          .where(
            and(
              eq(examScores.examId, compareExam.id),
              inArray(examScores.studentId, studentIds),
              isNull(examScores.deletedAt)
            )
          )
      : [];

    // 9. Fetch mark submissions status for this class
    const submissions = await db
      .select({
        subjectId: markSubmissions.subjectId,
        status: markSubmissions.status,
        submittedAt: markSubmissions.submittedAt,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(markSubmissions)
      .leftJoin(users, eq(markSubmissions.teacherId, users.id))
      .where(
        and(
          eq(markSubmissions.examId, selectedExam.id),
          eq(markSubmissions.classId, classId),
          isNull(markSubmissions.deletedAt)
        )
      );

    const submissionMap = new Map<string, { status: string; teacherName: string }>();
    for (const sub of submissions) {
      submissionMap.set(sub.subjectId, {
        status: sub.status,
        teacherName: sub.teacherFirstName ? `${sub.teacherFirstName} ${sub.teacherLastName}` : 'Subject Teacher',
      });
    }

    // 10. Fetch CAT assessments and scores for the active term
    const termCats = await db
      .select({
        id: catAssessments.id,
        subjectId: catAssessments.subjectId,
        catNumber: catAssessments.catNumber,
        maxMarks: catAssessments.maxMarks,
      })
      .from(catAssessments)
      .where(
        and(
          eq(catAssessments.termId, selectedExam.termId),
          eq(catAssessments.classId, classId),
          isNull(catAssessments.deletedAt)
        )
      );

    const catIds = termCats.map((c) => c.id);
    const catScoresList = catIds.length > 0 && studentIds.length > 0
      ? await db
          .select({
            catId: catScores.catId,
            studentId: catScores.studentId,
            marksObtained: catScores.marksObtained,
          })
          .from(catScores)
          .where(
            and(
              inArray(catScores.catId, catIds),
              inArray(catScores.studentId, studentIds),
              isNull(catScores.deletedAt)
            )
          )
      : [];

    // Map CAT scores by (studentId, subjectId) and by subjectId
    const catAssessmentMap = new Map(termCats.map((c) => [c.id, c]));
    const studentCatMap = new Map<string, Map<string, number[]>>(); // studentId -> subjectId -> marks[]
    const subjectCatMap = new Map<string, number[]>(); // subjectId -> marks[]

    for (const cs of catScoresList) {
      const cat = catAssessmentMap.get(cs.catId);
      if (!cat) continue;
      const marks = typeof cs.marksObtained === 'number' ? cs.marksObtained : parseFloat(cs.marksObtained as any) || 0;
      const normalizedPct = cat.maxMarks > 0 ? (marks / cat.maxMarks) * 100 : marks;

      // Student level
      if (!studentCatMap.has(cs.studentId)) studentCatMap.set(cs.studentId, new Map());
      const sMap = studentCatMap.get(cs.studentId)!;
      if (!sMap.has(cat.subjectId)) sMap.set(cat.subjectId, []);
      sMap.get(cat.subjectId)!.push(normalizedPct);

      // Subject level
      if (!subjectCatMap.has(cat.subjectId)) subjectCatMap.set(cat.subjectId, []);
      subjectCatMap.get(cat.subjectId)!.push(normalizedPct);
    }

    // 11. Fetch Report Card Locks
    const reportLocks = await db
      .select({
        isLocked: reportCardLocks.isLocked,
        lockedAt: reportCardLocks.lockedAt,
      })
      .from(reportCardLocks)
      .where(
        and(
          eq(reportCardLocks.termId, selectedExam.termId),
          eq(reportCardLocks.classId, classId),
          isNull(reportCardLocks.deletedAt)
        )
      )
      .limit(1);

    const isLocked = reportLocks.length > 0 ? reportLocks[0].isLocked : false;
    const lockedAt = reportLocks.length > 0 && reportLocks[0].lockedAt ? reportLocks[0].lockedAt.toISOString() : null;

    // 12. Fetch Report Card Remarks count
    const studentRemarks = await db
      .select({
        studentId: reportCardRemarks.studentId,
        classTeacherRemark: reportCardRemarks.classTeacherRemark,
      })
      .from(reportCardRemarks)
      .where(
        and(
          eq(reportCardRemarks.termId, selectedExam.termId),
          eq(reportCardRemarks.classId, classId),
          isNull(reportCardRemarks.deletedAt)
        )
      );

    const remarksCompletedCount = studentRemarks.filter((r) => r.classTeacherRemark && r.classTeacherRemark.trim().length > 0).length;

    // -------------------------------------------------------------
    // CALCULATIONS & AGGREGATIONS
    // -------------------------------------------------------------

    // A. Operational mark readiness
    let submittedSubjectsCount = 0;
    const pendingSubjects: Array<{ subjectId: string; subjectName: string; teacherName: string }> = [];

    for (const sub of classSubjects) {
      const submission = submissionMap.get(sub.id);
      const isSubmitted = submission && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'].includes(submission.status);
      if (isSubmitted) {
        submittedSubjectsCount++;
      } else {
        pendingSubjects.push({
          subjectId: sub.id,
          subjectName: sub.name,
          teacherName: sub.teacherName,
        });
      }
    }

    // B. Group current scores by student
    const studentCurrentMap = new Map<string, Map<string, number>>();
    for (const cs of currentScores) {
      const mark = typeof cs.marksObtained === 'number' ? cs.marksObtained : parseFloat(cs.marksObtained as any) || 0;
      if (!studentCurrentMap.has(cs.studentId)) studentCurrentMap.set(cs.studentId, new Map());
      studentCurrentMap.get(cs.studentId)!.set(cs.subjectId, mark);
    }

    // C. Group baseline scores by student
    const studentBaselineMap = new Map<string, Map<string, number>>();
    for (const bs of baselineScores) {
      const mark = typeof bs.marksObtained === 'number' ? bs.marksObtained : parseFloat(bs.marksObtained as any) || 0;
      if (!studentBaselineMap.has(bs.studentId)) studentBaselineMap.set(bs.studentId, new Map());
      studentBaselineMap.get(bs.studentId)!.set(bs.subjectId, mark);
    }

    // Calculate baseline student means & ranks
    const baselineLearnerStats: Array<{ studentId: string; meanPct: number; points: number }> = [];
    for (const student of enrolledStudents) {
      const bScores = studentBaselineMap.get(student.id);
      if (bScores && bScores.size > 0) {
        let total = 0;
        for (const m of bScores.values()) total += m;
        const meanPct = +(total / bScores.size).toFixed(1);
        const pts = getJuniorPointScale(meanPct).points;
        baselineLearnerStats.push({ studentId: student.id, meanPct, points: pts });
      }
    }
    baselineLearnerStats.sort((a, b) => b.meanPct - a.meanPct);
    const baselineRankMap = new Map<string, { rank: number; meanPct: number; points: number }>();
    baselineLearnerStats.forEach((stat, idx) => {
      baselineRankMap.set(stat.studentId, { rank: idx + 1, meanPct: stat.meanPct, points: stat.points });
    });

    // D. Process Learner Broadsheet Rows
    interface LearnerRow {
      studentId: string;
      admissionNo: string;
      fullName: string;
      gender: string | null;
      rank: number;
      previousRank: number | null;
      rankDelta: number | null;
      totalMarks: number;
      maxMarks: number;
      meanPct: number;
      deltaPct: number | null;
      overallRubricOrPoints: string;
      points: number;
      deltaPoints: number | null;
      missingSubjectsCount: number;
      personalBottleneckSubject: {
        subjectId: string;
        name: string;
        code: string;
        marks: number;
        rubricOrPoints: string;
        varianceFromLearnerMean: number;
      } | null;
      scoresBySubject: Record<
        string,
        {
          marks: number | null;
          rubricOrPoints: string;
          isMissing: boolean;
          isBelowExpectations: boolean;
        }
      >;
    }

    const unrankedLearners: Omit<LearnerRow, 'rank' | 'rankDelta'>[] = [];
    let classTotalSat = 0;

    for (const student of enrolledStudents) {
      const sScores = studentCurrentMap.get(student.id) || new Map<string, number>();
      const satCount = sScores.size;
      if (satCount > 0) classTotalSat++;

      let totalMarks = 0;
      const scoresBySubject: LearnerRow['scoresBySubject'] = {};
      let bottleneck: LearnerRow['personalBottleneckSubject'] = null;
      let minDiff = Infinity;

      for (const sub of classSubjects) {
        if (sScores.has(sub.id)) {
          const m = sScores.get(sub.id)!;
          totalMarks += m;
          const rubricOrPts = isJunior
            ? `${getJuniorPointScale(m).points} pts (${getJuniorPointScale(m).label})`
            : getPrimaryRubric(m);
          const isBe = isJunior ? getJuniorPointScale(m).points <= 2 : m < 40;

          scoresBySubject[sub.id] = {
            marks: m,
            rubricOrPoints: rubricOrPts,
            isMissing: false,
            isBelowExpectations: isBe,
          };
        } else {
          scoresBySubject[sub.id] = {
            marks: null,
            rubricOrPoints: '—',
            isMissing: true,
            isBelowExpectations: false,
          };
        }
      }

      // Mean calculations
      const meanPct = satCount > 0 ? +(totalMarks / satCount).toFixed(1) : 0;
      const maxMarks = classSubjects.length * 100;
      const rubric = getPrimaryRubric(meanPct);
      const jScale = getJuniorPointScale(meanPct);
      const overallRubricOrPoints = isJunior ? `${jScale.points} pts (${jScale.label})` : rubric;

      // Personal bottleneck determination
      if (satCount > 0) {
        for (const sub of classSubjects) {
          if (sScores.has(sub.id)) {
            const m = sScores.get(sub.id)!;
            const diff = m - meanPct;
            if (diff < minDiff) {
              minDiff = diff;
              bottleneck = {
                subjectId: sub.id,
                name: sub.name,
                code: sub.code,
                marks: m,
                rubricOrPoints: isJunior ? `${getJuniorPointScale(m).points} pts` : getPrimaryRubric(m),
                varianceFromLearnerMean: +diff.toFixed(1),
              };
            }
          }
        }
      }

      // Baseline delta
      const bStat = baselineRankMap.get(student.id);
      const deltaPct = bStat ? +(meanPct - bStat.meanPct).toFixed(1) : null;
      const deltaPoints = bStat && isJunior ? +(jScale.points - bStat.points).toFixed(1) : null;

      unrankedLearners.push({
        studentId: student.id,
        admissionNo: student.admissionNumber || student.assessmentNumber || 'N/A',
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        gender: student.gender,
        previousRank: bStat ? bStat.rank : null,
        totalMarks: +totalMarks.toFixed(1),
        maxMarks,
        meanPct,
        deltaPct,
        overallRubricOrPoints,
        points: jScale.points,
        deltaPoints,
        missingSubjectsCount: classSubjects.length - satCount,
        personalBottleneckSubject: bottleneck,
        scoresBySubject,
      });
    }

    // Sort by mean percentage descending, then total marks descending
    unrankedLearners.sort((a, b) => {
      if (b.meanPct !== a.meanPct) return b.meanPct - a.meanPct;
      return b.totalMarks - a.totalMarks;
    });

    const learners: LearnerRow[] = unrankedLearners.map((lr, idx) => {
      const rank = idx + 1;
      const rankDelta = lr.previousRank !== null ? lr.previousRank - rank : null;
      return {
        ...lr,
        rank,
        rankDelta,
      };
    });

    // E. Subject Analysis Table (View B)
    const subjectAnalysisList: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      teacherName: string;
      submissionState: 'SUBMITTED' | 'PENDING';
      examMeanPct: number;
      examDeltaPct: number | null;
      examMeanPointsOrRubric: string;
      catMeanPct: number | null;
      catToExamVariancePct: number | null;
      distributionCounts: Record<string, number>;
      beCount: number;
    }> = [];

    // Pre-calculate baseline subject means
    const baselineSubjectMeans = new Map<string, number>();
    if (compareExam && baselineScores.length > 0) {
      const bSubTotals = new Map<string, { sum: number; count: number }>();
      for (const bs of baselineScores) {
        const mark = typeof bs.marksObtained === 'number' ? bs.marksObtained : parseFloat(bs.marksObtained as any) || 0;
        if (!bSubTotals.has(bs.subjectId)) bSubTotals.set(bs.subjectId, { sum: 0, count: 0 });
        const cur = bSubTotals.get(bs.subjectId)!;
        cur.sum += mark;
        cur.count++;
      }
      for (const [subId, data] of bSubTotals.entries()) {
        baselineSubjectMeans.set(subId, data.count > 0 ? +(data.sum / data.count).toFixed(1) : 0);
      }
    }

    for (const sub of classSubjects) {
      const subScores: number[] = [];
      const distributionCounts: Record<string, number> = isJunior
        ? { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        : { EE: 0, ME: 0, AE: 0, BE: 0 };
      let beCount = 0;

      for (const learner of learners) {
        const scoreEntry = learner.scoresBySubject[sub.id];
        if (scoreEntry && scoreEntry.marks !== null) {
          const m = scoreEntry.marks;
          subScores.push(m);
          if (isJunior) {
            const pt = getJuniorPointScale(m).points;
            distributionCounts[pt] = (distributionCounts[pt] || 0) + 1;
            if (pt <= 2) beCount++;
          } else {
            const rub = getPrimaryRubric(m);
            distributionCounts[rub] = (distributionCounts[rub] || 0) + 1;
            if (rub === 'BE') beCount++;
          }
        }
      }

      const examMeanPct = subScores.length > 0
        ? +(subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1)
        : 0;

      const baseMean = baselineSubjectMeans.get(sub.id);
      const examDeltaPct = baseMean !== undefined ? +(examMeanPct - baseMean).toFixed(1) : null;

      const examMeanPointsOrRubric = isJunior
        ? `${getJuniorPointScale(examMeanPct).points} pts (${getJuniorPointScale(examMeanPct).label})`
        : getPrimaryRubric(examMeanPct);

      // CAT average
      const catMarks = subjectCatMap.get(sub.id) || [];
      const catMeanPct = catMarks.length > 0
        ? +(catMarks.reduce((a, b) => a + b, 0) / catMarks.length).toFixed(1)
        : null;

      const catToExamVariancePct = catMeanPct !== null ? +(examMeanPct - catMeanPct).toFixed(1) : null;

      const subState = submissionMap.get(sub.id);
      const isSubSubmitted = subState && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'].includes(subState.status);

      subjectAnalysisList.push({
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        teacherName: sub.teacherName,
        submissionState: isSubSubmitted ? 'SUBMITTED' : 'PENDING',
        examMeanPct,
        examDeltaPct,
        examMeanPointsOrRubric,
        catMeanPct,
        catToExamVariancePct,
        distributionCounts,
        beCount,
      });
    }

    // F. Overall Class Academic Summary
    const satLearners = learners.filter((l) => l.totalMarks > 0);
    const classMeanPct = satLearners.length > 0
      ? +(satLearners.reduce((acc, l) => acc + l.meanPct, 0) / satLearners.length).toFixed(1)
      : 0;

    let baselineClassMean: number | null = null;
    if (baselineLearnerStats.length > 0) {
      baselineClassMean = +(
        baselineLearnerStats.reduce((acc, l) => acc + l.meanPct, 0) / baselineLearnerStats.length
      ).toFixed(1);
    }
    const classDeltaPct = baselineClassMean !== null ? +(classMeanPct - baselineClassMean).toFixed(1) : null;

    // Trajectory counts
    let improvedCount = 0;
    let stableCount = 0;
    let droppedCount = 0;

    for (const l of learners) {
      if (l.deltaPct !== null) {
        if (l.deltaPct >= 2.0) improvedCount++;
        else if (l.deltaPct <= -2.0) droppedCount++;
        else stableCount++;
      }
    }

    // Primary summary vs JSS summary
    let modeRubric: 'EE' | 'ME' | 'AE' | 'BE' = 'ME';
    let classMeanPoints: number | undefined;
    let classDeltaPoints: number | undefined;
    let masteryRatePct = 0;
    let beLearnerCount = 0;

    if (isJunior) {
      const totalPoints = satLearners.reduce((acc, l) => acc + l.points, 0);
      classMeanPoints = satLearners.length > 0 ? +(totalPoints / satLearners.length).toFixed(1) : 0;

      if (baselineLearnerStats.length > 0) {
        const baseTotalPoints = baselineLearnerStats.reduce((acc, l) => acc + l.points, 0);
        const baseMeanPoints = +(baseTotalPoints / baselineLearnerStats.length).toFixed(1);
        classDeltaPoints = +(classMeanPoints - baseMeanPoints).toFixed(1);
      }

      // Mastery: 5-8 pts (ME1, EE2, EE1)
      const masteryCount = satLearners.filter((l) => l.points >= 5).length;
      masteryRatePct = satLearners.length > 0 ? Math.round((masteryCount / satLearners.length) * 100) : 0;
      beLearnerCount = satLearners.filter((l) => l.points <= 2).length;
    } else {
      const rubricFreq: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      for (const l of satLearners) {
        const r = getPrimaryRubric(l.meanPct);
        rubricFreq[r] = (rubricFreq[r] || 0) + 1;
      }
      let highestCount = -1;
      for (const [r, count] of Object.entries(rubricFreq)) {
        if (count > highestCount) {
          highestCount = count;
          modeRubric = r as any;
        }
      }

      // Mastery: EE + ME
      const masteryCount = (rubricFreq.EE || 0) + (rubricFreq.ME || 0);
      masteryRatePct = satLearners.length > 0 ? Math.round((masteryCount / satLearners.length) * 100) : 0;
      beLearnerCount = rubricFreq.BE || 0;
    }

    // G. Fetch Class Target Mean for this exam
    const targetRows = await db
      .select({
        id: classExamTargets.id,
        targetMeanPercentage: classExamTargets.targetMeanPercentage,
        targetMeanPoints: classExamTargets.targetMeanPoints,
        notes: classExamTargets.notes,
        setById: classExamTargets.setById,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(classExamTargets)
      .leftJoin(users, eq(classExamTargets.setById, users.id))
      .where(
        and(
          eq(classExamTargets.examId, selectedExam.id),
          eq(classExamTargets.classId, classId),
          isNull(classExamTargets.deletedAt)
        )
      )
      .limit(1);

    const targetRow = targetRows[0] || null;
    const targetMeanPct = targetRow ? parseFloat(targetRow.targetMeanPercentage as any) : null;
    const targetPoints = targetRow && targetRow.targetMeanPoints ? parseFloat(targetRow.targetMeanPoints as any) : null;
    const diffFromTargetPct = targetMeanPct !== null ? +(classMeanPct - targetMeanPct).toFixed(1) : null;
    const isTargetMet = targetMeanPct !== null ? classMeanPct >= targetMeanPct : null;
    const setByTeacherName = targetRow && targetRow.teacherFirstName ? `${targetRow.teacherFirstName} ${targetRow.teacherLastName}` : null;

    return {
      availableExams,
      availableClasses: allDbClasses,
      selectedExam: {
        id: selectedExam.id,
        title: selectedExam.title,
        termNumber: selectedExam.termNumber,
        year: selectedExam.year,
      },
      compareExam: compareExam
        ? {
            id: compareExam.id,
            title: compareExam.title,
            termNumber: compareExam.termNumber,
            year: compareExam.year,
          }
        : null,
      classInfo: {
        id: targetClass.id,
        name: targetClass.name,
        levelCategory: targetClass.levelCategory,
        isJuniorSecondary: isJunior,
        classTeacherName: targetClass.teacherFirstName
          ? `${targetClass.teacherFirstName} ${targetClass.teacherLastName}`
          : 'Unassigned',
        classTeacherId: targetClass.classTeacherId,
        enrolledCount: enrolledStudents.length,
        satCount: classTotalSat,
      },
      submissionStatus: {
        submittedSubjectsCount,
        totalSubjectsCount: classSubjects.length,
        pendingSubjects,
      },
      academicSummary: {
        meanPct: classMeanPct,
        deltaPct: classDeltaPct,
        modeRubric: isJunior ? undefined : modeRubric,
        meanPoints: classMeanPoints,
        deltaPoints: classDeltaPoints,
        masteryRatePct,
        beLearnerCount,
      },
      targetMean: {
        targetMeanPercentage: targetMeanPct,
        targetMeanPoints: targetPoints,
        isMet: isTargetMet,
        diffFromTarget: diffFromTargetPct,
        setByTeacherName,
        notes: targetRow?.notes || null,
      },
      trajectoryCounts: {
        improvedCount,
        stableCount,
        droppedCount,
      },
      reportLockStatus: {
        isLocked,
        lockedAt,
        remarksCompletedCount,
        totalLearnersCount: enrolledStudents.length,
      },
      learners,
      subjects: subjectAnalysisList,
    };
  }

  /**
   * Retrieves Learner 360 Diagnostic data for Slide-Over Drawer
   */
  static async getLearnerDiagnostic(
    classId: string,
    studentId: string,
    examId?: string,
    user?: AuthenticatedUser
  ) {
    // 1. Authorization check
    const userScope = await this.resolveUserScope(user, classId);
    if (!userScope.isLeadership && !userScope.isAssignedClassTeacher) {
      const err: any = new Error('Access denied: You are not authorized to view this student profile.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Fetch full workspace to obtain accurate class aggregates & current student status
    const workspace = await this.getClassWorkspace(classId, examId, undefined, user);
    const learner = workspace.learners.find((l) => l.studentId === studentId);
    if (!learner) {
      const err: any = new Error('Student not found in this class.');
      err.statusCode = 404;
      throw err;
    }

    // 3. Historical Trajectory (Last 4 chronological exams)
    const pastExams = await db
      .select({
        id: examinations.id,
        title: examinations.title,
        termNumber: academicTerms.termNumber,
        year: academicTerms.year,
        createdAt: examinations.createdAt,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(academicTerms.year), desc(academicTerms.termNumber), desc(examinations.createdAt))
      .limit(4);

    const examHistory: Array<{
      examId: string;
      examName: string;
      termName: string;
      meanPct: number;
      rubricOrPoints: string;
      rank: number;
    }> = [];

    for (const ex of pastExams.reverse()) {
      // Fetch student scores for this exam
      const studentPastScores = await db
        .select({
          marksObtained: examScores.marksObtained,
        })
        .from(examScores)
        .where(
          and(
            eq(examScores.examId, ex.id),
            eq(examScores.studentId, studentId),
            isNull(examScores.deletedAt)
          )
        );

      if (studentPastScores.length > 0) {
        let total = 0;
        for (const s of studentPastScores) {
          total += typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained as any) || 0;
        }
        const meanPct = +(total / studentPastScores.length).toFixed(1);
        const rubricOrPts = workspace.classInfo.isJuniorSecondary
          ? `${getJuniorPointScale(meanPct).points} pts (${getJuniorPointScale(meanPct).label})`
          : getPrimaryRubric(meanPct);

        examHistory.push({
          examId: ex.id,
          examName: ex.title,
          termName: `T${ex.termNumber} ${ex.year}`,
          meanPct,
          rubricOrPoints: rubricOrPts,
          rank: ex.id === workspace.selectedExam.id ? learner.rank : 1,
        });
      }
    }

    // 4. Subject Comparison Table
    const subjectComparison: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      teacherName: string;
      learnerExamMarks: number | null;
      learnerRubricOrPoints: string | null;
      classSubjectMeanPct: number;
      varianceFromClassMean: number | null;
      learnerCatAvgPct: number | null;
      catToExamGap: number | null;
      previousExamMarks: number | null;
      subjectDelta: number | null;
    }> = [];

    // Fetch student CAT marks for active term
    const termCats = await db
      .select({
        id: catAssessments.id,
        subjectId: catAssessments.subjectId,
        maxMarks: catAssessments.maxMarks,
      })
      .from(catAssessments)
      .where(
        and(
          eq(catAssessments.termId, workspace.selectedExam.id ? (await db.select({ termId: examinations.termId }).from(examinations).where(eq(examinations.id, workspace.selectedExam.id)))[0]?.termId : sql`NULL`),
          eq(catAssessments.classId, classId),
          isNull(catAssessments.deletedAt)
        )
      );

    const catIds = termCats.map((c) => c.id);
    const learnerCatScores = catIds.length > 0
      ? await db
          .select({
            catId: catScores.catId,
            marksObtained: catScores.marksObtained,
          })
          .from(catScores)
          .where(
            and(
              inArray(catScores.catId, catIds),
              eq(catScores.studentId, studentId),
              isNull(catScores.deletedAt)
            )
          )
      : [];

    const catMap = new Map(termCats.map((c) => [c.id, c]));
    const studentSubjectCatAvg = new Map<string, number>();
    const subCatTotals = new Map<string, { sum: number; count: number }>();

    for (const cs of learnerCatScores) {
      const cat = catMap.get(cs.catId);
      if (!cat) continue;
      const marks = typeof cs.marksObtained === 'number' ? cs.marksObtained : parseFloat(cs.marksObtained as any) || 0;
      const normalizedPct = cat.maxMarks > 0 ? (marks / cat.maxMarks) * 100 : marks;

      if (!subCatTotals.has(cat.subjectId)) subCatTotals.set(cat.subjectId, { sum: 0, count: 0 });
      const cur = subCatTotals.get(cat.subjectId)!;
      cur.sum += normalizedPct;
      cur.count++;
    }

    for (const [subId, data] of subCatTotals.entries()) {
      studentSubjectCatAvg.set(subId, data.count > 0 ? +(data.sum / data.count).toFixed(1) : 0);
    }

    // Fetch learner baseline marks if comparison exam exists
    const prevExamScores = workspace.compareExam
      ? await db
          .select({
            subjectId: examScores.subjectId,
            marksObtained: examScores.marksObtained,
          })
          .from(examScores)
          .where(
            and(
              eq(examScores.examId, workspace.compareExam.id),
              eq(examScores.studentId, studentId),
              isNull(examScores.deletedAt)
            )
          )
      : [];

    const prevMarksMap = new Map<string, number>();
    for (const ps of prevExamScores) {
      const mark = typeof ps.marksObtained === 'number' ? ps.marksObtained : parseFloat(ps.marksObtained as any) || 0;
      prevMarksMap.set(ps.subjectId, mark);
    }

    for (const sub of workspace.subjects) {
      const scoreEntry = learner.scoresBySubject[sub.subjectId];
      const examMark = scoreEntry && scoreEntry.marks !== null ? scoreEntry.marks : null;
      const rubricOrPts = scoreEntry && scoreEntry.marks !== null ? scoreEntry.rubricOrPoints : null;
      const classMean = sub.examMeanPct;
      const varianceFromClass = examMark !== null ? +(examMark - classMean).toFixed(1) : null;
      const catAvg = studentSubjectCatAvg.has(sub.subjectId) ? studentSubjectCatAvg.get(sub.subjectId)! : null;
      const catGap = examMark !== null && catAvg !== null ? +(examMark - catAvg).toFixed(1) : null;
      const prevMark = prevMarksMap.has(sub.subjectId) ? prevMarksMap.get(sub.subjectId)! : null;
      const subDelta = examMark !== null && prevMark !== null ? +(examMark - prevMark).toFixed(1) : null;

      subjectComparison.push({
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        teacherName: sub.teacherName,
        learnerExamMarks: examMark,
        learnerRubricOrPoints: rubricOrPts,
        classSubjectMeanPct: classMean,
        varianceFromClassMean: varianceFromClass,
        learnerCatAvgPct: catAvg,
        catToExamGap: catGap,
        previousExamMarks: prevMark,
        subjectDelta: subDelta,
      });
    }

    // 5. Attendance Summary for active term
    const activeExam = await db
      .select({ termId: examinations.termId })
      .from(examinations)
      .where(eq(examinations.id, workspace.selectedExam.id))
      .limit(1);

    const termId = activeExam[0]?.termId;
    let attendanceSummary = {
      totalSchoolDays: 0,
      daysPresent: 0,
      daysAbsent: 0,
      attendancePct: 100,
    };

    if (termId) {
      const termInfo = await db
        .select({
          startDate: academicTerms.startDate,
          endDate: academicTerms.endDate,
        })
        .from(academicTerms)
        .where(eq(academicTerms.id, termId))
        .limit(1);

      if (termInfo.length > 0 && termInfo[0].startDate && termInfo[0].endDate) {
        const registers = await db
          .select({
            id: attendanceRegisters.id,
            date: attendanceRegisters.date,
          })
          .from(attendanceRegisters)
          .where(
            and(
              eq(attendanceRegisters.classId, classId),
              sql`${attendanceRegisters.date} >= ${termInfo[0].startDate}::date`,
              sql`${attendanceRegisters.date} <= ${termInfo[0].endDate}::date`,
              isNull(attendanceRegisters.deletedAt)
            )
          );

        const registerIds = registers.map((r) => r.id);
        if (registerIds.length > 0) {
          const records = await db
            .select({
              status: attendanceRecords.status,
            })
            .from(attendanceRecords)
            .where(
              and(
                inArray(attendanceRecords.registerId, registerIds),
                eq(attendanceRecords.studentId, studentId),
                isNull(attendanceRecords.deletedAt)
              )
            );

          const daysPresent = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
          const daysAbsent = records.filter((r) => r.status === 'ABSENT').length;
          const totalDays = registers.length;
          const attendancePct = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100;

          attendanceSummary = {
            totalSchoolDays: totalDays,
            daysPresent,
            daysAbsent,
            attendancePct,
          };
        }
      }
    }

    // 6. Report Card Remark State
    let classTeacherRemark = '';
    if (termId) {
      const remarkRow = await db
        .select({
          classTeacherRemark: reportCardRemarks.classTeacherRemark,
        })
        .from(reportCardRemarks)
        .where(
          and(
            eq(reportCardRemarks.termId, termId),
            eq(reportCardRemarks.studentId, studentId),
            isNull(reportCardRemarks.deletedAt)
          )
        )
        .limit(1);

      if (remarkRow.length > 0) {
        classTeacherRemark = remarkRow[0].classTeacherRemark;
      }
    }

    return {
      studentProfile: {
        id: learner.studentId,
        fullName: learner.fullName,
        admissionNo: learner.admissionNo,
        gender: learner.gender,
        rank: learner.rank,
        totalLearners: workspace.learners.length,
        meanPct: learner.meanPct,
        overallRubricOrPoints: learner.overallRubricOrPoints,
        deltaPct: learner.deltaPct,
      },
      examHistory,
      subjectComparison,
      attendanceSummary,
      reportCardState: {
        classTeacherRemark,
        isLocked: workspace.reportLockStatus.isLocked,
        canRequestUnlock: workspace.reportLockStatus.isLocked,
      },
    };
  }

  /**
   * Saves Class Teacher's Report Card remark or submits an unlock request
   */
  static async saveLearnerRemark(
    classId: string,
    studentId: string,
    body: {
      examId?: string;
      remark?: string;
      action?: 'save' | 'request_unlock';
      reason?: string;
    },
    user?: AuthenticatedUser
  ) {
    if (!user) {
      const err: any = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    // 1. Authorization check
    const userScope = await this.resolveUserScope(user, classId);
    if (!userScope.isLeadership && !userScope.isAssignedClassTeacher) {
      const err: any = new Error('Access denied: Only assigned Class Teachers or leadership can submit remarks.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Resolve target term from examId
    let termId: string | null = null;
    if (body.examId) {
      const ex = await db
        .select({ termId: examinations.termId })
        .from(examinations)
        .where(eq(examinations.id, body.examId))
        .limit(1);
      if (ex.length > 0) termId = ex[0].termId;
    }

    if (!termId) {
      const currentTerm = await db
        .select({ id: academicTerms.id })
        .from(academicTerms)
        .where(eq(academicTerms.isCurrent, true))
        .limit(1);
      if (currentTerm.length > 0) termId = currentTerm[0].id;
    }

    if (!termId) {
      const err: any = new Error('Could not resolve active academic term.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Check report card lock status
    const lockRows = await db
      .select({ isLocked: reportCardLocks.isLocked })
      .from(reportCardLocks)
      .where(and(eq(reportCardLocks.termId, termId), eq(reportCardLocks.classId, classId)))
      .limit(1);

    const isLocked = lockRows.length > 0 ? lockRows[0].isLocked : false;

    // 4. Handle unlock request if locked
    if (isLocked) {
      if (body.action === 'request_unlock') {
        await db.insert(reportUnlockRequests).values({
          classId,
          termId,
          requestedById: user.id,
          reason: body.reason || 'Class Teacher requesting unlock to update learner remark.',
          status: 'PENDING',
        });
        return {
          success: true,
          message: 'Unlock request submitted successfully to administration.',
          isLocked: true,
        };
      }

      if (!userScope.isLeadership) {
        const err: any = new Error(
          'Report cards for this class and term are locked. Please submit an unlock request to make updates.'
        );
        err.statusCode = 403;
        throw err;
      }
    }

    // 5. Upsert remark
    const remarkText = (body.remark || '').trim();

    await db
      .insert(reportCardRemarks)
      .values({
        termId,
        classId,
        studentId,
        examId: body.examId || null,
        classTeacherRemark: remarkText,
        enteredById: user.id,
      })
      .onConflictDoUpdate({
        target: [reportCardRemarks.termId, reportCardRemarks.studentId],
        set: {
          classTeacherRemark: remarkText,
          examId: body.examId || null,
          enteredById: user.id,
          updatedAt: new Date(),
        },
      });

    return {
      success: true,
      message: 'Remark saved successfully.',
      remark: remarkText,
    };
  }

  /**
   * Sets or updates Class Target Mean for an examination
   */
  static async setTargetMean(
    classId: string,
    body: {
      examId: string;
      targetMeanPercentage: number;
      targetMeanPoints?: number;
      notes?: string;
    },
    user?: AuthenticatedUser
  ) {
    if (!user) {
      const err: any = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const userScope = await this.resolveUserScope(user, classId);
    if (!userScope.isLeadership && !userScope.isAssignedClassTeacher) {
      const err: any = new Error('Access denied: Only assigned Class Teachers or leadership can set class target expectations.');
      err.statusCode = 403;
      throw err;
    }

    if (!body.examId || body.targetMeanPercentage === undefined || isNaN(Number(body.targetMeanPercentage))) {
      const err: any = new Error('Valid Exam ID and Target Mean Percentage are required.');
      err.statusCode = 400;
      throw err;
    }

    const targetPct = Number(body.targetMeanPercentage);
    if (targetPct < 0 || targetPct > 100) {
      const err: any = new Error('Target Mean Percentage must be between 0 and 100.');
      err.statusCode = 400;
      throw err;
    }

    await db
      .insert(classExamTargets)
      .values({
        examId: body.examId,
        classId,
        targetMeanPercentage: String(targetPct),
        targetMeanPoints: body.targetMeanPoints ? String(body.targetMeanPoints) : null,
        setById: user.id,
        notes: body.notes || null,
      })
      .onConflictDoUpdate({
        target: [classExamTargets.examId, classExamTargets.classId],
        set: {
          targetMeanPercentage: String(targetPct),
          targetMeanPoints: body.targetMeanPoints ? String(body.targetMeanPoints) : null,
          setById: user.id,
          notes: body.notes || null,
          updatedAt: new Date(),
        },
      });

    return {
      success: true,
      message: 'Class target mean expectation saved successfully.',
      targetMean: {
        targetMeanPercentage: targetPct,
        targetMeanPoints: body.targetMeanPoints || null,
      },
    };
  }
}
