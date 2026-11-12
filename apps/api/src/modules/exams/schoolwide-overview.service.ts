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
  eq,
  and,
  isNull,
  desc,
  inArray,
} from '@school/shared';

export interface PrimaryRubricCounts {
  EE: number;
  ME: number;
  AE: number;
  BE: number;
}

export interface JuniorPointCounts {
  8: number; // EE1
  7: number; // EE2
  6: number; // ME1
  5: number; // ME2
  4: number; // AE1
  3: number; // AE2
  2: number; // BE1
  1: number; // BE2
}

export function getPrimaryRubric(percentage: number): 'EE' | 'ME' | 'AE' | 'BE' {
  if (percentage >= 75) return 'EE';
  if (percentage >= 50) return 'ME';
  if (percentage >= 40) return 'AE';
  return 'BE';
}

export function getJuniorPointScale(percentage: number): {
  points: number;
  label: 'EE1' | 'EE2' | 'ME1' | 'ME2' | 'AE1' | 'AE2' | 'BE1' | 'BE2';
} {
  if (percentage >= 90) return { points: 8, label: 'EE1' };
  if (percentage >= 75) return { points: 7, label: 'EE2' };
  if (percentage >= 58) return { points: 6, label: 'ME1' };
  if (percentage >= 41) return { points: 5, label: 'ME2' };
  if (percentage >= 31) return { points: 4, label: 'AE1' };
  if (percentage >= 21) return { points: 3, label: 'AE2' };
  if (percentage >= 11) return { points: 2, label: 'BE1' };
  return { points: 1, label: 'BE2' };
}

export function isJuniorGrade(cls: { levelCategory: string; numericOrder?: number; name?: string }): boolean {
  if (cls.levelCategory === 'JUNIOR') return true;
  if (cls.numericOrder !== undefined && cls.numericOrder >= 10) return true;
  if (cls.name && /grade\s*[7-9]/i.test(cls.name)) return true;
  return false;
}

export class SchoolwideOverviewService {
  /**
   * Resolves target and preceding comparison examination
   */
  static async resolveExams(examId?: string, compareExamId?: string) {
    const allExams = await db
      .select({
        id: examinations.id,
        title: examinations.title,
        status: examinations.status,
        createdAt: examinations.createdAt,
        termId: examinations.termId,
        termNumber: academicTerms.termNumber,
        year: academicTerms.year,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(academicTerms.year), desc(academicTerms.termNumber), desc(examinations.createdAt));

    if (allExams.length === 0) {
      return {
        selectedExam: null,
        compareExam: null,
        availableExams: [],
      };
    }

    let selectedExam = allExams[0];
    if (examId && examId !== 'latest') {
      const found = allExams.find((e) => e.id === examId);
      if (found) selectedExam = found;
    }

    const currentIndex = allExams.findIndex((e) => e.id === selectedExam.id);
    let compareExam = null;

    if (compareExamId && compareExamId !== 'none' && compareExamId !== 'auto') {
      compareExam = allExams.find((e) => e.id === compareExamId) || null;
    } else if (compareExamId === 'none') {
      compareExam = null;
    } else {
      // Auto default: immediately preceding examination
      if (currentIndex !== -1 && currentIndex + 1 < allExams.length) {
        compareExam = allExams[currentIndex + 1];
      }
    }

    const availableExams = allExams.map((e) => ({
      id: e.id,
      title: e.title,
      termNumber: e.termNumber,
      year: e.year,
      label: `${e.title} (Term ${e.termNumber} ${e.year})`,
    }));

    return {
      selectedExam,
      compareExam,
      availableExams,
    };
  }

  /**
   * Helper to compute learner performance aggregates for an exam
   */
  static aggregateLearnerScores(
    scores: Array<{
      studentId: string;
      subjectId: string;
      marksObtained: string | number;
    }>
  ) {
    const studentScoreMap = new Map<string, { total: number; count: number; subjects: Map<string, number> }>();

    for (const s of scores) {
      const marks = typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained) || 0;
      if (!studentScoreMap.has(s.studentId)) {
        studentScoreMap.set(s.studentId, { total: 0, count: 0, subjects: new Map() });
      }
      const entry = studentScoreMap.get(s.studentId)!;
      entry.total += marks;
      entry.count += 1;
      entry.subjects.set(s.subjectId, marks);
    }

    const learnerAggregates = new Map<
      string,
      {
        totalMarks: number;
        subjectCount: number;
        meanPercentage: number;
        primaryRubric: 'EE' | 'ME' | 'AE' | 'BE';
        juniorScale: { points: number; label: string };
        subjects: Map<string, number>;
      }
    >();

    for (const [studentId, data] of studentScoreMap.entries()) {
      const meanPercentage = data.count > 0 ? +(data.total / data.count).toFixed(1) : 0;
      learnerAggregates.set(studentId, {
        totalMarks: data.total,
        subjectCount: data.count,
        meanPercentage,
        primaryRubric: getPrimaryRubric(meanPercentage),
        juniorScale: getJuniorPointScale(meanPercentage),
        subjects: data.subjects,
      });
    }

    return learnerAggregates;
  }

  /**
   * Aggregates schoolwide performance overview
   */
  static async getSchoolwideOverview(examId?: string, compareExamId?: string) {
    const { selectedExam, compareExam, availableExams } = await this.resolveExams(examId, compareExamId);

    if (!selectedExam) {
      return {
        selectedExam: null,
        compareExam: null,
        availableExams: [],
        summaryRibbon: null,
        primaryClasses: [],
        juniorClasses: [],
      };
    }

    // 1. Fetch Classes with Teachers
    const allClasses = await db
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
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder, classes.name);

    // 2. Fetch Active Students
    const allStudents = await db
      .select({
        id: students.id,
        classId: students.classId,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        assessmentNumber: students.assessmentNumber,
      })
      .from(students)
      .where(and(eq(students.status, 'ACTIVE'), isNull(students.deletedAt)));

    const studentsByClass = new Map<string, typeof allStudents>();
    for (const s of allStudents) {
      if (!studentsByClass.has(s.classId)) {
        studentsByClass.set(s.classId, []);
      }
      studentsByClass.get(s.classId)!.push(s);
    }

    // 3. Fetch All Subjects
    const allSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        levelCategory: subjects.levelCategory,
      })
      .from(subjects)
      .where(isNull(subjects.deletedAt));

    const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));

    // 4. Fetch Scores for Target Exam & Compare Exam
    const examIdsToFetch = [selectedExam.id];
    if (compareExam) examIdsToFetch.push(compareExam.id);

    const scores = await db
      .select({
        examId: examScores.examId,
        studentId: examScores.studentId,
        subjectId: examScores.subjectId,
        marksObtained: examScores.marksObtained,
      })
      .from(examScores)
      .where(and(inArray(examScores.examId, examIdsToFetch), isNull(examScores.deletedAt)));

    const currentScores = scores.filter((s) => s.examId === selectedExam.id);
    const compareScores = compareExam ? scores.filter((s) => s.examId === compareExam.id) : [];

    const currentLearnerAggregates = this.aggregateLearnerScores(currentScores);
    const compareLearnerAggregates = this.aggregateLearnerScores(compareScores);

    // 5. Build Class Performance Rows
    const gradeRows = [];
    let schoolSatCount = 0;
    let schoolEnrolledCount = 0;

    let primarySatCount = 0;
    let primarySumPercentage = 0;
    let primaryEeMeCount = 0;
    let primaryBeCount = 0;
    let primaryPrevSatCount = 0;
    let primaryPrevSumPercentage = 0;
    const primaryRubricTotals = { EE: 0, ME: 0, AE: 0, BE: 0 };

    let juniorSatCount = 0;
    let juniorSumPercentage = 0;
    let juniorSumPoints = 0;
    let juniorMe1PlusCount = 0;
    let juniorBeCount = 0;
    let juniorPrevSatCount = 0;
    let juniorPrevSumPercentage = 0;
    let juniorPrevSumPoints = 0;

    // Schoolwide subject aggregates for Outlier analysis
    const schoolSubjectAggs = new Map<string, { total: number; count: number; name: string }>();

    for (const cls of allClasses) {
      const isJunior = isJuniorGrade(cls);
      const classStudents = studentsByClass.get(cls.id) || [];
      const enrolledCount = classStudents.length;
      schoolEnrolledCount += enrolledCount;

      const satLearners = [];
      const prevSatLearners = [];

      for (const st of classStudents) {
        const cur = currentLearnerAggregates.get(st.id);
        if (cur && cur.subjectCount > 0) {
          satLearners.push({ student: st, ...cur });
        }
        const prev = compareLearnerAggregates.get(st.id);
        if (prev && prev.subjectCount > 0) {
          prevSatLearners.push({ student: st, ...prev });
        }
      }

      const satCount = satLearners.length;
      schoolSatCount += satCount;

      let meanPercentage = 0;
      let deltaPercentage: number | null = null;
      let rubricCounts: PrimaryRubricCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };
      let rubricMode: 'EE' | 'ME' | 'AE' | 'BE' = 'ME';
      let meanPoints = 0;
      let deltaPoints: number | null = null;
      let pointCounts: JuniorPointCounts = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      // Subject stats for this class
      const classSubjectStats = new Map<string, { total: number; count: number; name: string }>();

      if (satCount > 0) {
        const totalPct = satLearners.reduce((sum, l) => sum + l.meanPercentage, 0);
        meanPercentage = +(totalPct / satCount).toFixed(1);

        // Previous delta
        if (prevSatLearners.length > 0) {
          const prevTotalPct = prevSatLearners.reduce((sum, l) => sum + l.meanPercentage, 0);
          const prevMeanPct = +(prevTotalPct / prevSatLearners.length).toFixed(1);
          deltaPercentage = +(meanPercentage - prevMeanPct).toFixed(1);
        }

        if (isJunior) {
          const totalPoints = satLearners.reduce((sum, l) => sum + l.juniorScale.points, 0);
          meanPoints = +(totalPoints / satCount).toFixed(1);

          for (const l of satLearners) {
            const pt = l.juniorScale.points as keyof JuniorPointCounts;
            if (pointCounts[pt] !== undefined) pointCounts[pt]++;
          }

          if (prevSatLearners.length > 0) {
            const prevTotalPts = prevSatLearners.reduce((sum, l) => sum + l.juniorScale.points, 0);
            const prevMeanPts = +(prevTotalPts / prevSatLearners.length).toFixed(1);
            deltaPoints = +(meanPoints - prevMeanPts).toFixed(1);
          }

          juniorSatCount += satCount;
          juniorSumPercentage += totalPct;
          juniorSumPoints += totalPoints;
          juniorMe1PlusCount += pointCounts[8] + pointCounts[7] + pointCounts[6];
          juniorBeCount += pointCounts[2] + pointCounts[1];

          if (prevSatLearners.length > 0) {
            juniorPrevSatCount += prevSatLearners.length;
            juniorPrevSumPercentage += prevSatLearners.reduce((sum, l) => sum + l.meanPercentage, 0);
            juniorPrevSumPoints += prevSatLearners.reduce((sum, l) => sum + l.juniorScale.points, 0);
          }
        } else {
          for (const l of satLearners) {
            rubricCounts[l.primaryRubric]++;
            primaryRubricTotals[l.primaryRubric]++;
          }

          // Calculate mode
          const tiers: Array<'EE' | 'ME' | 'AE' | 'BE'> = ['EE', 'ME', 'AE', 'BE'];
          let maxCount = -1;
          for (const t of tiers) {
            if (rubricCounts[t] > maxCount) {
              maxCount = rubricCounts[t];
              rubricMode = t;
            }
          }

          primarySatCount += satCount;
          primarySumPercentage += totalPct;
          primaryEeMeCount += rubricCounts.EE + rubricCounts.ME;
          primaryBeCount += rubricCounts.BE;

          if (prevSatLearners.length > 0) {
            primaryPrevSatCount += prevSatLearners.length;
            primaryPrevSumPercentage += prevSatLearners.reduce((sum, l) => sum + l.meanPercentage, 0);
          }
        }

        // Aggregate subjects for this class
        for (const l of satLearners) {
          for (const [subId, score] of l.subjects.entries()) {
            const sub = subjectMap.get(subId);
            const name = sub?.name || 'Subject';
            if (!classSubjectStats.has(subId)) {
              classSubjectStats.set(subId, { total: 0, count: 0, name });
            }
            const sEntry = classSubjectStats.get(subId)!;
            sEntry.total += score;
            sEntry.count += 1;

            if (!schoolSubjectAggs.has(subId)) {
              schoolSubjectAggs.set(subId, { total: 0, count: 0, name });
            }
            const gEntry = schoolSubjectAggs.get(subId)!;
            gEntry.total += score;
            gEntry.count += 1;
          }
        }
      }

      // Strongest & Weakest Subjects
      let strongestSubject: { name: string; meanPct: number; pointsOrRubric: string } | null = null;
      let weakestSubject: { name: string; meanPct: number; pointsOrRubric: string } | null = null;

      if (classSubjectStats.size > 0) {
        const sortedSubs = Array.from(classSubjectStats.values())
          .filter((s) => s.count > 0)
          .map((s) => {
            const meanPct = +(s.total / s.count).toFixed(1);
            return {
              name: s.name,
              meanPct,
              pointsOrRubric: isJunior
                ? `${getJuniorPointScale(meanPct).points} pts (${getJuniorPointScale(meanPct).label})`
                : getPrimaryRubric(meanPct),
            };
          })
          .sort((a, b) => b.meanPct - a.meanPct);

        if (sortedSubs.length > 0) {
          strongestSubject = sortedSubs[0];
          weakestSubject = sortedSubs[sortedSubs.length - 1];
        }
      }

      // Top Learner
      let topLearner: { id: string; name: string; meanPct: number; pointsOrRubric: string } | null = null;
      if (satLearners.length > 0) {
        satLearners.sort((a, b) => b.meanPercentage - a.meanPercentage);
        const top = satLearners[0];
        topLearner = {
          id: top.student.id,
          name: `${top.student.firstName} ${top.student.lastName}`,
          meanPct: top.meanPercentage,
          pointsOrRubric: isJunior
            ? `${top.juniorScale.points} pts (${top.juniorScale.label})`
            : top.primaryRubric,
        };
      }

      const classTeacherName = cls.teacherFirstName
        ? `${cls.teacherFirstName} ${cls.teacherLastName || ''}`.trim()
        : 'Not Assigned';

      gradeRows.push({
        classId: cls.id,
        gradeName: cls.name,
        levelCategory: cls.levelCategory,
        numericOrder: cls.numericOrder,
        isJunior,
        classTeacherId: cls.classTeacherId,
        classTeacherName,
        enrolledCount,
        satCount,
        hasMarks: satCount > 0,
        meanPercentage,
        deltaPercentage,
        rubricMode: isJunior ? null : rubricMode,
        rubricCounts: isJunior ? null : rubricCounts,
        meanPoints: isJunior ? meanPoints : null,
        deltaPoints: isJunior ? deltaPoints : null,
        pointCounts: isJunior ? pointCounts : null,
        strongestSubject,
        weakestSubject,
        topLearner,
      });
    }

    // 6. Calculate Schoolwide Summary Ribbon Data
    const schoolCandidacyPct = schoolEnrolledCount > 0 ? +((schoolSatCount / schoolEnrolledCount) * 100).toFixed(1) : 0;

    // Primary Block summary
    const primaryMeanPct = primarySatCount > 0 ? +(primarySumPercentage / primarySatCount).toFixed(1) : 0;
    const primaryPrevMeanPct = primaryPrevSatCount > 0 ? +(primaryPrevSumPercentage / primaryPrevSatCount).toFixed(1) : 0;
    const primaryDeltaMeanPct = primaryPrevSatCount > 0 ? +(primaryMeanPct - primaryPrevMeanPct).toFixed(1) : null;
    const primaryMasteryPct = primarySatCount > 0 ? +((primaryEeMeCount / primarySatCount) * 100).toFixed(0) : 0;

    let primaryRubricMode: 'EE' | 'ME' | 'AE' | 'BE' = 'ME';
    let pMax = -1;
    for (const t of ['EE', 'ME', 'AE', 'BE'] as const) {
      if (primaryRubricTotals[t] > pMax) {
        pMax = primaryRubricTotals[t];
        primaryRubricMode = t;
      }
    }

    // Junior Block summary
    const juniorMeanPoints = juniorSatCount > 0 ? +(juniorSumPoints / juniorSatCount).toFixed(1) : 0;
    const juniorMeanPct = juniorSatCount > 0 ? +(juniorSumPercentage / juniorSatCount).toFixed(1) : 0;
    const juniorPrevMeanPoints = juniorPrevSatCount > 0 ? +(juniorPrevSumPoints / juniorPrevSatCount).toFixed(1) : 0;
    const juniorPrevMeanPct = juniorPrevSatCount > 0 ? +(juniorPrevSumPercentage / juniorPrevSatCount).toFixed(1) : 0;
    const juniorDeltaPoints = juniorPrevSatCount > 0 ? +(juniorMeanPoints - juniorPrevMeanPoints).toFixed(1) : null;
    const juniorDeltaMeanPct = juniorPrevSatCount > 0 ? +(juniorMeanPct - juniorPrevMeanPct).toFixed(1) : null;
    const juniorMasteryPct = juniorSatCount > 0 ? +((juniorMe1PlusCount / juniorSatCount) * 100).toFixed(0) : 0;
    const juniorScaleSummary = getJuniorPointScale(juniorMeanPct);

    // School Outliers
    let topOutlier: { name: string; meanPct: number } | null = null;
    let watchOutlier: { name: string; meanPct: number } | null = null;

    if (schoolSubjectAggs.size > 0) {
      const sortedSchoolSubs = Array.from(schoolSubjectAggs.values())
        .filter((s) => s.count > 0)
        .map((s) => ({
          name: s.name,
          meanPct: +(s.total / s.count).toFixed(1),
        }))
        .sort((a, b) => b.meanPct - a.meanPct);

      if (sortedSchoolSubs.length > 0) {
        topOutlier = sortedSchoolSubs[0];
        watchOutlier = sortedSchoolSubs[sortedSchoolSubs.length - 1];
      }
    }

    const totalRemedialWatchlist = primaryBeCount + juniorBeCount;

    const summaryRibbon = {
      candidacy: {
        satCount: schoolSatCount,
        enrolledCount: schoolEnrolledCount,
        percentage: schoolCandidacyPct,
      },
      primaryBlock: {
        meanPercentage: primaryMeanPct,
        rubricMode: primaryRubricMode,
        masteryPercentage: primaryMasteryPct,
        beCount: primaryBeCount,
        deltaMeanPct: primaryDeltaMeanPct,
      },
      juniorBlock: {
        meanPoints: juniorMeanPoints,
        meanPercentage: juniorMeanPct,
        scaleLabel: juniorScaleSummary.label,
        masteryPercentage: juniorMasteryPct,
        beCount: juniorBeCount,
        deltaPoints: juniorDeltaPoints,
        deltaMeanPct: juniorDeltaMeanPct,
      },
      outliers: {
        top: topOutlier,
        watch: watchOutlier,
      },
      remedialWatchlistCount: totalRemedialWatchlist,
    };

    const primaryClasses = gradeRows.filter((r) => !r.isJunior);
    const juniorClasses = gradeRows.filter((r) => r.isJunior);

    return {
      selectedExam,
      compareExam,
      availableExams,
      summaryRibbon,
      primaryClasses,
      juniorClasses,
      allGradeRows: gradeRows,
    };
  }

  /**
   * Aggregates detailed grade overview:
   * - Grade summary metrics
   * - Learning Area (subject) breakdown
   * - Student broadsheet merit list with per-subject marks & rubrics/points
   */
  static async getGradeOverview(classId: string, examId?: string, compareExamId?: string) {
    const { selectedExam, compareExam, availableExams } = await this.resolveExams(examId, compareExamId);

    if (!selectedExam) {
      const err = new Error('No examination found');
      (err as any).statusCode = 404;
      throw err;
    }

    // 1. Fetch Class
    const [targetClass] = await db
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

    if (!targetClass) {
      const err = new Error('Class not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const isJunior = isJuniorGrade(targetClass);
    const classTeacherName = targetClass.teacherFirstName
      ? `${targetClass.teacherFirstName} ${targetClass.teacherLastName || ''}`.trim()
      : 'Not Assigned';

    // 2. Fetch Active Students in Class
    const classStudents = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        assessmentNumber: students.assessmentNumber,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        gender: students.gender,
      })
      .from(students)
      .where(and(eq(students.classId, classId), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .orderBy(students.lastName, students.firstName);

    const enrolledCount = classStudents.length;
    const studentIds = classStudents.map((s) => s.id);

    // 3. Fetch Teacher Subject Allocations for this class
    const allocations = await db
      .select({
        subjectId: teacherSubjectAllocations.subjectId,
        teacherId: teacherSubjectAllocations.teacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
      .where(and(eq(teacherSubjectAllocations.classId, classId), isNull(teacherSubjectAllocations.deletedAt)));

    const teacherBySubject = new Map<string, string>();
    for (const a of allocations) {
      teacherBySubject.set(a.subjectId, `${a.teacherFirstName} ${a.teacherLastName || ''}`.trim());
    }

    // 4. Fetch Scores for Target Exam & Compare Exam
    const examIdsToFetch = [selectedExam.id];
    if (compareExam) examIdsToFetch.push(compareExam.id);

    let scores: Array<{
      examId: string;
      studentId: string;
      subjectId: string;
      marksObtained: string | number;
    }> = [];

    if (studentIds.length > 0) {
      scores = await db
        .select({
          examId: examScores.examId,
          studentId: examScores.studentId,
          subjectId: examScores.subjectId,
          marksObtained: examScores.marksObtained,
        })
        .from(examScores)
        .where(
          and(
            inArray(examScores.examId, examIdsToFetch),
            inArray(examScores.studentId, studentIds),
            isNull(examScores.deletedAt)
          )
        );
    }

    const currentScores = scores.filter((s) => s.examId === selectedExam.id);
    const compareScores = compareExam ? scores.filter((s) => s.examId === compareExam.id) : [];

    // Distinct subject IDs with scores or allocations
    const subjectIds = new Set<string>();
    for (const s of currentScores) subjectIds.add(s.subjectId);
    for (const s of compareScores) subjectIds.add(s.subjectId);
    for (const a of allocations) subjectIds.add(a.subjectId);

    const classSubjects = subjectIds.size > 0
      ? await db
          .select({
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
            levelCategory: subjects.levelCategory,
          })
          .from(subjects)
          .where(and(inArray(subjects.id, Array.from(subjectIds)), isNull(subjects.deletedAt)))
          .orderBy(subjects.name)
      : [];

    const subjectMap = new Map(classSubjects.map((s) => [s.id, s]));

    // Aggregate Learner Scores for Current Exam
    const currentLearnerAggregates = this.aggregateLearnerScores(currentScores);
    const compareLearnerAggregates = this.aggregateLearnerScores(compareScores);

    // 5. Build Learning Area (Subject) Breakdown
    const subjectBreakdown = [];
    for (const sub of classSubjects) {
      const curSubScores = currentScores.filter((s) => s.subjectId === sub.id);
      const prevSubScores = compareScores.filter((s) => s.subjectId === sub.id);

      const teacherName = teacherBySubject.get(sub.id) || 'Not Assigned';
      const satCount = curSubScores.length;

      let meanPct = 0;
      let deltaPct: number | null = null;
      let beCount = 0;

      const rubricDistribution: PrimaryRubricCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };
      const pointDistribution: JuniorPointCounts = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (satCount > 0) {
        const totalMarks = curSubScores.reduce((sum, s) => {
          const m = typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained) || 0;
          return sum + m;
        }, 0);
        meanPct = +(totalMarks / satCount).toFixed(1);

        if (prevSubScores.length > 0) {
          const prevTotal = prevSubScores.reduce((sum, s) => {
            const m = typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained) || 0;
            return sum + m;
          }, 0);
          const prevMean = +(prevTotal / prevSubScores.length).toFixed(1);
          deltaPct = +(meanPct - prevMean).toFixed(1);
        }

        for (const s of curSubScores) {
          const m = typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained) || 0;
          if (isJunior) {
            const pt = getJuniorPointScale(m).points as keyof JuniorPointCounts;
            if (pointDistribution[pt] !== undefined) pointDistribution[pt]++;
            if (m < 21) beCount++;
          } else {
            const rub = getPrimaryRubric(m);
            rubricDistribution[rub]++;
            if (m < 40) beCount++;
          }
        }
      }

      const meanPointsOrRubric = isJunior
        ? `${getJuniorPointScale(meanPct).points} pts (${getJuniorPointScale(meanPct).label})`
        : getPrimaryRubric(meanPct);

      subjectBreakdown.push({
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        teacherName,
        satCount,
        meanPct,
        deltaPct,
        meanPointsOrRubric,
        distribution: isJunior ? pointDistribution : rubricDistribution,
        beCount,
      });
    }

    // Sort subjects by meanPct descending
    subjectBreakdown.sort((a, b) => b.meanPct - a.meanPct);

    // 6. Build Student Broadsheet & Performance List
    const broadsheet = [];
    for (const st of classStudents) {
      const cur = currentLearnerAggregates.get(st.id);
      const prev = compareLearnerAggregates.get(st.id);

      const studentSubjectsMap: Record<string, { marks: number; rubricOrPoints: string; rubric: string; points: number }> = {};

      if (cur) {
        for (const [subId, marks] of cur.subjects.entries()) {
          const rubric = getPrimaryRubric(marks);
          const jScale = getJuniorPointScale(marks);
          studentSubjectsMap[subId] = {
            marks,
            rubricOrPoints: isJunior ? `${jScale.points} pts` : rubric,
            rubric,
            points: jScale.points,
          };
        }
      }

      const totalMarks = cur?.totalMarks || 0;
      const subjectCount = cur?.subjectCount || 0;
      const maxPossibleMarks = subjectCount * 100;
      const meanPct = cur?.meanPercentage || 0;

      let deltaPct: number | null = null;
      if (cur && prev && prev.subjectCount > 0) {
        deltaPct = +(meanPct - prev.meanPercentage).toFixed(1);
      }

      const overallRubricOrPoints = isJunior
        ? `${getJuniorPointScale(meanPct).points} pts (${getJuniorPointScale(meanPct).label})`
        : getPrimaryRubric(meanPct);

      const fullName = [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' ');

      broadsheet.push({
        rank: 0,
        studentId: st.id,
        admissionNo: st.admissionNumber || st.assessmentNumber,
        assessmentNumber: st.assessmentNumber,
        fullName,
        gender: st.gender,
        hasMarks: subjectCount > 0,
        totalMarks,
        maxPossibleMarks,
        meanPct,
        deltaPct,
        overallRubric: getPrimaryRubric(meanPct),
        overallPoints: getJuniorPointScale(meanPct).points,
        overallRubricOrPoints,
        subjects: studentSubjectsMap,
      });
    }

    // Sort broadsheet by meanPct descending to calculate rank
    broadsheet.sort((a, b) => b.meanPct - a.meanPct);
    broadsheet.forEach((learner, index) => {
      learner.rank = index + 1;
    });

    // 7. Calculate Grade Summary Header Data
    const satLearners = broadsheet.filter((l) => l.hasMarks);
    const satCount = satLearners.length;

    let gradeMeanPct = 0;
    let gradeDeltaPct: number | null = null;
    let gradeMeanPoints: number | null = null;
    let gradeDeltaPoints: number | null = null;

    if (satCount > 0) {
      const sumPct = satLearners.reduce((sum, l) => sum + l.meanPct, 0);
      gradeMeanPct = +(sumPct / satCount).toFixed(1);

      if (isJunior) {
        const sumPts = satLearners.reduce((sum, l) => sum + l.overallPoints, 0);
        gradeMeanPoints = +(sumPts / satCount).toFixed(1);
      }

      const prevLearners = classStudents
        .map((st) => compareLearnerAggregates.get(st.id))
        .filter((c) => c && c.subjectCount > 0);

      if (prevLearners.length > 0) {
        const prevSumPct = prevLearners.reduce((sum, l) => sum + l!.meanPercentage, 0);
        const prevMeanPct = +(prevSumPct / prevLearners.length).toFixed(1);
        gradeDeltaPct = +(gradeMeanPct - prevMeanPct).toFixed(1);

        if (isJunior) {
          const prevSumPts = prevLearners.reduce((sum, l) => sum + l!.juniorScale.points, 0);
          const prevMeanPts = +(prevSumPts / prevLearners.length).toFixed(1);
          gradeDeltaPoints = +(gradeMeanPoints! - prevMeanPts).toFixed(1);
        }
      }
    }

    const gradeHeader = {
      classId: targetClass.id,
      gradeName: targetClass.name,
      levelCategory: targetClass.levelCategory,
      numericOrder: targetClass.numericOrder,
      isJunior,
      classTeacherId: targetClass.classTeacherId,
      classTeacherName,
      enrolledCount,
      satCount,
      hasMarks: satCount > 0,
      meanPercentage: gradeMeanPct,
      meanPoints: gradeMeanPoints,
      deltaPercentage: gradeDeltaPct,
      deltaPoints: gradeDeltaPoints,
      overallScaleOrRubric: isJunior
        ? `${gradeMeanPoints || 0} pts (${getJuniorPointScale(gradeMeanPct).label})`
        : getPrimaryRubric(gradeMeanPct),
    };

    return {
      selectedExam,
      compareExam,
      availableExams,
      gradeHeader,
      subjectBreakdown,
      broadsheet,
      subjects: classSubjects,
    };
  }
}
