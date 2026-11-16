import { db } from '../../config/db.js';
import {
  examScores,
  subjects,
  classes,
  students,
  examinations,
  academicTerms,
  systemSettings,
  users,
  teacherSubjectAllocations,
  markingAllocations,
  catAssessments,
  catScores,
  markSubmissions,
  subjectExamTargets,
  calculateCbcRubric,
  calculateJuniorPoints,
  isJuniorSecondaryClass,
  eq,
  isNull,
  and,
  desc,
  sql,
  inArray,
  count,
} from '@school/shared';
import { AuthenticatedUser } from '../../middleware/auth.js';
import { LeaveRequestsService } from '../leave-requests/leaveRequests.service.js';

export class DosService {
  static async getSubjectAnalytics(user?: AuthenticatedUser) {
    const isLeadership = !user || ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'DOS'].includes(user.roleName || '');
    const managedClassIds = new Set<string>();
    const allocatedClassSubjectPairs = new Set<string>();
    const allocatedClassIds = new Set<string>();
    const allocatedSubjectIds = new Set<string>();

    if (!isLeadership && user) {
      // 1. Resolve Class Teacher assignments
      const assignedClasses = await db
        .select({
          id: classes.id,
          levelCategory: classes.levelCategory,
        })
        .from(classes)
        .where(and(eq(classes.classTeacherId, user.id), isNull(classes.deletedAt)));

      for (const cls of assignedClasses) {
        managedClassIds.add(cls.id);
      }

      try {
        const delegation = await LeaveRequestsService.getActiveStandInDelegationForTeacher(user.id);
        if (delegation?.assignedClass) {
          managedClassIds.add(delegation.assignedClass.id);
        }
      } catch (e) {
        // proceed if delegation check fails
      }

      // 2. Resolve Subject Allocations
      const [teacherAllocs, markingAllocs] = await Promise.all([
        db
          .select({
            classId: teacherSubjectAllocations.classId,
            subjectId: teacherSubjectAllocations.subjectId,
          })
          .from(teacherSubjectAllocations)
          .where(and(eq(teacherSubjectAllocations.teacherId, user.id), isNull(teacherSubjectAllocations.deletedAt))),
        db
          .select({
            classId: markingAllocations.classId,
            subjectId: markingAllocations.subjectId,
          })
          .from(markingAllocations)
          .where(and(eq(markingAllocations.teacherId, user.id), isNull(markingAllocations.deletedAt))),
      ]);

      for (const a of [...teacherAllocs, ...markingAllocs]) {
        allocatedClassSubjectPairs.add(`${a.classId}:${a.subjectId}`);
        allocatedClassIds.add(a.classId);
        allocatedSubjectIds.add(a.subjectId);
      }

      // Zero-allocation check
      if (managedClassIds.size === 0 && allocatedClassSubjectPairs.size === 0) {
        const forbiddenError = new Error('Access denied: You do not have an active class assignment or subject allocation.');
        (forbiddenError as any).statusCode = 403;
        throw forbiddenError;
      }
    }

    const [subjectsList, allClassesList] = await Promise.all([
      db
        .select()
        .from(subjects)
        .where(isNull(subjects.deletedAt))
        .orderBy(subjects.name),
      db
        .select({
          id: classes.id,
          levelCategory: classes.levelCategory,
          numericOrder: classes.numericOrder,
        })
        .from(classes)
        .where(isNull(classes.deletedAt)),
    ]);

    let visibleSubjectsList = subjectsList;
    if (!isLeadership) {
      visibleSubjectsList = subjectsList.filter((s) => {
        if (allocatedSubjectIds.has(s.id)) return true;
        if (managedClassIds.size > 0) {
          return Array.from(managedClassIds).some((cId) => {
            const cls = allClassesList.find((c) => c.id === cId);
            if (!cls) return false;
            if (cls.levelCategory === s.levelCategory) return true;
            if (
              ['PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY'].includes(cls.levelCategory) &&
              ['PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY'].includes(s.levelCategory)
            ) {
              return isJuniorSecondaryClass(cls as any) === (s.levelCategory === 'JUNIOR');
            }
            return false;
          });
        }
        return false;
      });
    }

    const allowedClassIds = isLeadership
      ? null
      : (managedClassIds.size > 0
          ? Array.from(managedClassIds)
          : Array.from(allocatedClassIds));

    const whereConditions: any[] = [
      isNull(examScores.deletedAt),
      isNull(students.deletedAt),
      isNull(subjects.deletedAt),
      isNull(classes.deletedAt),
    ];
    if (allowedClassIds && allowedClassIds.length > 0) {
      whereConditions.push(inArray(classes.id, allowedClassIds));
    }

    const scores = await db
      .select({
        score: {
          marksObtained: examScores.marksObtained,
        },
        subject: {
          id: subjects.id,
        },
        class: {
          id: classes.id,
        },
      })
      .from(examScores)
      .innerJoin(subjects, eq(examScores.subjectId, subjects.id))
      .innerJoin(students, eq(examScores.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(and(...whereConditions));

    const authorizedScores = isLeadership
      ? scores
      : scores.filter((row) => {
          if (managedClassIds.has(row.class.id)) return true;
          if (allocatedClassSubjectPairs.has(`${row.class.id}:${row.subject.id}`)) return true;
          return false;
        });

    const distribution = visibleSubjectsList.map((s) => {
      const subjectScores = authorizedScores.filter((sc) => sc.subject.id === s.id);
      const totalCount = subjectScores.length;

      let eeCount = 0;
      let meCount = 0;
      let aeCount = 0;
      let beCount = 0;
      let totalMarksSum = 0;

      subjectScores.forEach((sc) => {
        const marks = parseFloat(sc.score.marksObtained);
        totalMarksSum += marks;
        const rub = calculateCbcRubric(marks, 100).code;
        if (rub === 'EE') eeCount++;
        else if (rub === 'ME') meCount++;
        else if (rub === 'AE') aeCount++;
        else beCount++;
      });

      const averageScore = totalCount > 0 ? Math.round((totalMarksSum / totalCount) * 10) / 10 : 0;

      return {
        subjectId: s.id,
        subjectName: s.name,
        subjectCode: s.code,
        levelCategory: s.levelCategory,
        totalLearnersTested: totalCount,
        averageScore,
        gradeBreakdown: {
          EE: eeCount,
          ME: meCount,
          AE: aeCount,
          BE: beCount,
        },
      };
    });

    return distribution;
  }

  static async getExamAnalysis(examId?: string, classId?: string, user?: AuthenticatedUser) {
    const isLeadership = !user || ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'DOS'].includes(user.roleName || '');

    const managedClassIds = new Set<string>();
    const allocatedClassSubjectPairs = new Set<string>();
    const allocatedClassIds = new Set<string>();
    const allocatedSubjectIds = new Set<string>();

    if (!isLeadership && user) {
      // 1. Resolve Class Teacher assignments
      const assignedClasses = await db
        .select({
          id: classes.id,
          name: classes.name,
          levelCategory: classes.levelCategory,
          numericOrder: classes.numericOrder,
        })
        .from(classes)
        .where(and(eq(classes.classTeacherId, user.id), isNull(classes.deletedAt)));

      for (const cls of assignedClasses) {
        managedClassIds.add(cls.id);
      }

      // Check stand-in delegation
      try {
        const delegation = await LeaveRequestsService.getActiveStandInDelegationForTeacher(user.id);
        if (delegation?.assignedClass) {
          managedClassIds.add(delegation.assignedClass.id);
        }
      } catch (e) {
        // proceed if delegation check fails
      }

      // 2. Resolve Subject Allocations
      const [teacherAllocs, markingAllocs] = await Promise.all([
        db
          .select({
            classId: teacherSubjectAllocations.classId,
            subjectId: teacherSubjectAllocations.subjectId,
          })
          .from(teacherSubjectAllocations)
          .where(
            and(
              eq(teacherSubjectAllocations.teacherId, user.id),
              isNull(teacherSubjectAllocations.deletedAt)
            )
          ),
        db
          .select({
            classId: markingAllocations.classId,
            subjectId: markingAllocations.subjectId,
          })
          .from(markingAllocations)
          .where(
            and(
              eq(markingAllocations.teacherId, user.id),
              isNull(markingAllocations.deletedAt)
            )
          ),
      ]);

      for (const a of [...teacherAllocs, ...markingAllocs]) {
        allocatedClassSubjectPairs.add(`${a.classId}:${a.subjectId}`);
        allocatedClassIds.add(a.classId);
        allocatedSubjectIds.add(a.subjectId);
      }

      // 3. Zero-allocation check: If teacher has neither class teacher assignment nor subject allocations, forbid access
      if (managedClassIds.size === 0 && allocatedClassSubjectPairs.size === 0) {
        const forbiddenError = new Error('Access denied: You do not have an active class assignment or subject allocation.');
        (forbiddenError as any).statusCode = 403;
        throw forbiddenError;
      }

      // 4. Requested classId check: if teacher explicitly requested an unallocated class
      if (classId) {
        const hasAccessToRequestedClass = managedClassIds.has(classId) || allocatedClassIds.has(classId);
        if (!hasAccessToRequestedClass) {
          const forbiddenError = new Error('Access denied: You do not have authorization to view academic results for this class.');
          (forbiddenError as any).statusCode = 403;
          throw forbiddenError;
        }
      }
    }

    // Default targetClassId if teacher did not provide classId
    let targetClassId = classId;
    if (!targetClassId && !isLeadership) {
      if (managedClassIds.size > 0) {
        targetClassId = Array.from(managedClassIds)[0];
      } else if (allocatedClassIds.size > 0) {
        targetClassId = Array.from(allocatedClassIds)[0];
      }
    }

    // 1. Resolve target exam
    let targetExamId = examId;
    if (!targetExamId) {
      const [latestExam] = await db
        .select()
        .from(examinations)
        .where(isNull(examinations.deletedAt))
        .orderBy(desc(examinations.createdAt))
        .limit(1);
      if (latestExam) {
        targetExamId = latestExam.id;
      }
    }

    const allExams = await db
      .select({
        exam: examinations,
        term: academicTerms,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(examinations.createdAt));

    const targetExamRecord = allExams.find((e) => e.exam.id === targetExamId);

    // 2. Fetch all classes, teachers, active students, and subjects
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

    const activeStudents = await db
      .select({
        id: students.id,
        classId: students.classId,
      })
      .from(students)
      .where(and(eq(students.status, 'ACTIVE'), isNull(students.deletedAt)));

    const allSubjects = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt))
      .orderBy(subjects.name);

    const visibleClasses = isLeadership
      ? allClasses
      : (managedClassIds.size > 0
          ? allClasses.filter((c) => managedClassIds.has(c.id))
          : allClasses.filter((c) => allocatedClassIds.has(c.id)));

    let visibleSubjects = allSubjects;
    if (!isLeadership) {
      if (targetClassId) {
        if (managedClassIds.has(targetClassId)) {
          // Class Teacher viewing their assigned class stream:
          // Full subject access for this class's level category
          const targetCls = allClasses.find((c) => c.id === targetClassId);
          visibleSubjects = allSubjects.filter((s) => {
            if (!targetCls) return false;
            if (targetCls.levelCategory === s.levelCategory) return true;
            if (
              ['PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY'].includes(targetCls.levelCategory) &&
              ['PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY'].includes(s.levelCategory)
            ) {
              return isJuniorSecondaryClass(targetCls as any) === (s.levelCategory === 'JUNIOR');
            }
            return false;
          });
        } else {
          // Subject Teacher viewing an allocated class:
          // ONLY view performance for specific learning areas allocated to them in this class
          visibleSubjects = allSubjects.filter((s) =>
            allocatedClassSubjectPairs.has(`${targetClassId}:${s.id}`)
          );
        }
      } else {
        visibleSubjects = allSubjects.filter((s) => {
          if (allocatedSubjectIds.has(s.id)) return true;
          if (managedClassIds.size > 0) {
            return Array.from(managedClassIds).some((cId) => {
              const cls = allClasses.find((c) => c.id === cId);
              if (!cls) return false;
              if (cls.levelCategory === s.levelCategory) return true;
              if (
                ['PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY'].includes(cls.levelCategory) &&
                ['PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY'].includes(s.levelCategory)
              ) {
                return isJuniorSecondaryClass(cls as any) === (s.levelCategory === 'JUNIOR');
              }
              return false;
            });
          }
          return false;
        });
      }
    }

    // 3. Fetch scores for this exam
    const allowedClassIds = isLeadership
      ? null
      : (managedClassIds.size > 0
          ? Array.from(managedClassIds)
          : Array.from(allocatedClassIds));

    const whereConditions: any[] = [
      isNull(examScores.deletedAt),
      isNull(students.deletedAt),
      isNull(subjects.deletedAt),
      isNull(classes.deletedAt),
    ];
    if (targetExamId) {
      whereConditions.push(eq(examScores.examId, targetExamId));
    }
    if (allowedClassIds && allowedClassIds.length > 0) {
      whereConditions.push(inArray(classes.id, allowedClassIds));
    }

    let scoresQuery = db
      .select({
        score: {
          id: examScores.id,
          marksObtained: examScores.marksObtained,
          cbcRubricLevel: examScores.cbcRubricLevel,
          juniorPoints: examScores.juniorPoints,
          maxMarks: examScores.maxMarks,
          teacherRemarks: examScores.teacherRemarks,
        },
        student: {
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          assessmentNumber: students.assessmentNumber,
          admissionNumber: students.admissionNumber,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          levelCategory: subjects.levelCategory,
        },
        class: {
          id: classes.id,
          name: classes.name,
          levelCategory: classes.levelCategory,
        },
      })
      .from(examScores)
      .innerJoin(students, eq(examScores.studentId, students.id))
      .innerJoin(subjects, eq(examScores.subjectId, subjects.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(and(...whereConditions));

    const rawScores = await scoresQuery;

    const isScoreAuthorized = (row: typeof rawScores[0]) => {
      if (isLeadership) return true;
      if (managedClassIds.has(row.class.id)) return true;
      if (allocatedClassSubjectPairs.has(`${row.class.id}:${row.subject.id}`)) return true;
      return false;
    };

    const authorizedScores = isLeadership ? rawScores : rawScores.filter(isScoreAuthorized);

    // If viewing as a teacher (non-leadership), scope the overview, rubrics, honor roll, and remedial watchlist
    // strictly to the targeted class (and allocated subjects for that class if subject teacher)
    const isTargetClassClassTeacher = targetClassId ? managedClassIds.has(targetClassId) : false;
    let viewScores = authorizedScores;
    if (!isLeadership && targetClassId) {
      if (isTargetClassClassTeacher) {
        // Class Teacher: strictly view all scores for their assigned class
        viewScores = authorizedScores.filter((r) => r.class.id === targetClassId);
      } else {
        // Subject Teacher: strictly view allocated subjects in this class
        viewScores = authorizedScores.filter(
          (r) => r.class.id === targetClassId && allocatedClassSubjectPairs.has(`${targetClassId}:${r.subject.id}`)
        );
      }
    }

    // 4. Compute Overview & Student Aggregates (Class-Scoped for Teachers, School-Wide for Leadership)
    let totalMarksSum = 0;
    let eeTotal = 0;
    let meTotal = 0;
    let aeTotal = 0;
    let beTotal = 0;
    const pointsTotal: Record<number, number> = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const uniqueStudents = new Set<string>();

    const globalStudentMap = new Map<string, {
      studentId: string;
      studentName: string;
      assessmentNumber: string | null;
      admissionNumber: string | null;
      classId: string;
      className: string;
      levelCategory: string;
      isJunior: boolean;
      subjectsCount: number;
      totalMarks: number;
      topSubject: string;
      topScore: number;
      distinctionCount: number;
      failingCount: number;
      subjectScores: { subjectName: string; score: number; rubric: string | null; points: number | null }[];
    }>();

    const globalRemedialMap = new Map<string, {
      studentId: string;
      studentName: string;
      assessmentNumber: string | null;
      admissionNumber: string | null;
      classId: string;
      className: string;
      classTeacher: string;
      failingSubjects: { subjectName: string; marksObtained: number; rubric: string | null; points: number | null; remarks: string }[];
    }>();

    viewScores.forEach((row) => {
      const marks = parseFloat(row.score.marksObtained);
      totalMarksSum += marks;
      const sId = row.student.id;
      uniqueStudents.add(sId);

      const isJunior = isJuniorSecondaryClass(row.class);
      const rubCode = row.score.cbcRubricLevel || calculateCbcRubric(marks, row.score.maxMarks || 100).code;
      if (rubCode === 'EE') eeTotal++;
      else if (rubCode === 'ME') meTotal++;
      else if (rubCode === 'AE') aeTotal++;
      else beTotal++;

      let ptsValue: number | null = null;
      if (isJunior) {
        ptsValue = row.score.juniorPoints ?? calculateJuniorPoints(marks, row.score.maxMarks || 100);
        if (ptsValue in pointsTotal) {
          pointsTotal[ptsValue]++;
        }
      }

      // Populate global student map for Merit List (Honor Roll)
      if (!globalStudentMap.has(sId)) {
        globalStudentMap.set(sId, {
          studentId: sId,
          studentName: `${row.student.firstName} ${row.student.lastName}`,
          assessmentNumber: row.student.assessmentNumber || row.student.admissionNumber || '—',
          admissionNumber: row.student.assessmentNumber || row.student.admissionNumber || '—',
          classId: row.class.id,
          className: row.class.name,
          levelCategory: row.class.levelCategory,
          isJunior,
          subjectsCount: 0,
          totalMarks: 0,
          topSubject: '',
          topScore: -1,
          distinctionCount: 0,
          failingCount: 0,
          subjectScores: [],
        });
      }
      const sEntry = globalStudentMap.get(sId)!;
      sEntry.subjectsCount++;
      sEntry.totalMarks += marks;
      if (marks > sEntry.topScore) {
        sEntry.topScore = marks;
        sEntry.topSubject = row.subject.name;
      }
      if (marks >= 75 || rubCode === 'EE' || (ptsValue && ptsValue >= 7)) {
        sEntry.distinctionCount++;
      }
      if (marks < 50 || rubCode === 'BE') {
        sEntry.failingCount++;
      }
      sEntry.subjectScores.push({
        subjectName: row.subject.name,
        score: marks,
        rubric: rubCode,
        points: ptsValue,
      });

      // Populate Remedial Watchlist if score < 50 or BE
      if (marks < 50 || rubCode === 'BE') {
        if (!globalRemedialMap.has(sId)) {
          const clsMatch = allClasses.find((c) => c.id === row.class.id);
          const teacherName = clsMatch?.teacherFirstName ? `${clsMatch.teacherFirstName} ${clsMatch.teacherLastName}` : 'Unassigned';
          globalRemedialMap.set(sId, {
            studentId: sId,
            studentName: `${row.student.firstName} ${row.student.lastName}`,
            assessmentNumber: row.student.assessmentNumber || row.student.admissionNumber || '—',
            admissionNumber: row.student.assessmentNumber || row.student.admissionNumber || '—',
            classId: row.class.id,
            className: row.class.name,
            classTeacher: teacherName,
            failingSubjects: [],
          });
        }
        const rEntry = globalRemedialMap.get(sId)!;
        rEntry.failingSubjects.push({
          subjectName: row.subject.name,
          marksObtained: marks,
          rubric: rubCode,
          points: ptsValue,
          remarks: row.score.teacherRemarks || 'Requires remedial intervention',
        });
      }
    });

    const schoolAverage = viewScores.length > 0 ? Math.round((totalMarksSum / viewScores.length) * 10) / 10 : 0;
    const scopedActiveStudents = (!isLeadership && targetClassId)
      ? activeStudents.filter((s) => s.classId === targetClassId)
      : (isLeadership
          ? activeStudents
          : activeStudents.filter((s) => visibleClasses.some((c) => c.id === s.classId)));
    const totalEnrolled = scopedActiveStudents.length || uniqueStudents.size;
    const totalSat = uniqueStudents.size;
    const absentCount = Math.max(0, totalEnrolled - totalSat);
    const candidacyRate = totalEnrolled > 0 ? Math.round((totalSat / totalEnrolled) * 1000) / 10 : 100;

    const totalScoresCount = viewScores.length;
    const eeRate = totalScoresCount > 0 ? Math.round((eeTotal / totalScoresCount) * 100) : 0;
    const meRate = totalScoresCount > 0 ? Math.round((meTotal / totalScoresCount) * 100) : 0;
    const aeRate = totalScoresCount > 0 ? Math.round((aeTotal / totalScoresCount) * 100) : 0;
    const beRate = totalScoresCount > 0 ? Math.round((beTotal / totalScoresCount) * 100) : 0;
    const proficiencyBenchmark = eeRate + meRate;

    // 5. Subject Breakdown & Matrix
    const subjectSummaries = visibleSubjects.map((s) => {
      const subScores = viewScores.filter((r) => r.subject.id === s.id);
      const subCount = subScores.length;
      let subMarksSum = 0;
      let highest = 0;
      let lowest = subCount > 0 ? 100 : 0;
      let ee = 0;
      let me = 0;
      let ae = 0;
      let be = 0;
      const subPoints: Record<number, number> = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      const isSubJunior = s.levelCategory === 'JUNIOR';

      subScores.forEach((sc) => {
        const m = parseFloat(sc.score.marksObtained);
        subMarksSum += m;
        if (m > highest) highest = m;
        if (m < lowest) lowest = m;

        const rub = sc.score.cbcRubricLevel || calculateCbcRubric(m, sc.score.maxMarks || 100).code;
        if (rub === 'EE') ee++;
        else if (rub === 'ME') me++;
        else if (rub === 'AE') ae++;
        else be++;

        const isJunior = isJuniorSecondaryClass(sc.class);
        if (isJunior) {
          const pts = sc.score.juniorPoints ?? calculateJuniorPoints(m, sc.score.maxMarks || 100);
          if (pts in subPoints) {
            subPoints[pts]++;
          }
        }
      });

      const avg = subCount > 0 ? Math.round((subMarksSum / subCount) * 10) / 10 : 0;
      const targetScore = 70;
      const status: 'DISTINCTION' | 'ON_TRACK' | 'NEEDS_ATTENTION' =
        avg >= 75 ? 'DISTINCTION' : avg >= 60 ? 'ON_TRACK' : 'NEEDS_ATTENTION';

      return {
        subjectId: s.id,
        subjectName: s.name,
        subjectCode: s.code,
        levelCategory: s.levelCategory,
        isJunior: isSubJunior,
        testedCount: subCount,
        averageScore: avg,
        targetScore,
        variance: Math.round((avg - targetScore) * 10) / 10,
        highestScore: highest,
        lowestScore: lowest,
        status,
        needsAttention: subCount > 0 && (avg < 55 || (be / subCount) > 0.3),
        rubric: { EE: ee, ME: me, AE: ae, BE: be },
        points: subPoints,
      };
    });

    const activeSubjects = subjectSummaries.filter((s) => s.testedCount > 0);
    activeSubjects.sort((a, b) => b.averageScore - a.averageScore);
    const topSubject = activeSubjects.length > 0 ? activeSubjects[0] : null;
    const lowestSubject = activeSubjects.length > 0 ? activeSubjects[activeSubjects.length - 1] : null;

    // 6. Class Breakdown & Comparative League Table
    const classSummaries = visibleClasses.map((cls) => {
      const clsScores = authorizedScores.filter((r) => r.class.id === cls.id);
      const studentMap = new Map<string, { student: any; scores: any[]; totalMarks: number }>();
      let clsMarksSum = 0;
      let highestMark = 0;
      let lowestMark = clsScores.length > 0 ? 100 : 0;
      let ee = 0;
      let me = 0;
      let ae = 0;
      let be = 0;

      clsScores.forEach((r) => {
        if (!studentMap.has(r.student.id)) {
          studentMap.set(r.student.id, { student: r.student, scores: [], totalMarks: 0 });
        }
        const sEntry = studentMap.get(r.student.id)!;
        sEntry.scores.push(r);
        sEntry.totalMarks += parseFloat(r.score.marksObtained);

        const m = parseFloat(r.score.marksObtained);
        clsMarksSum += m;
        if (m > highestMark) highestMark = m;
        if (m < lowestMark) lowestMark = m;

        const rub = r.score.cbcRubricLevel || calculateCbcRubric(m, r.score.maxMarks || 100).code;
        if (rub === 'EE') ee++;
        else if (rub === 'ME') me++;
        else if (rub === 'AE') ae++;
        else be++;
      });

      const enrolledCount = activeStudents.filter((s) => s.classId === cls.id).length;
      const testedCount = studentMap.size;
      const classAverage = clsScores.length > 0 ? Math.round((clsMarksSum / clsScores.length) * 10) / 10 : 0;

      let topStudent: any = null;
      let maxStudentAvg = -1;
      let strugglingCount = 0;

      studentMap.forEach((entry) => {
        const sAvg = entry.scores.length > 0 ? entry.totalMarks / entry.scores.length : 0;
        if (sAvg > maxStudentAvg) {
          maxStudentAvg = sAvg;
          topStudent = {
            studentId: entry.student.id,
            name: `${entry.student.firstName} ${entry.student.lastName}`,
            assessmentNumber: entry.student.assessmentNumber || entry.student.admissionNumber || '—',
            admissionNumber: entry.student.assessmentNumber || entry.student.admissionNumber || '—',
            average: Math.round(sAvg * 10) / 10,
          };
        }
        if (sAvg < 50) {
          strugglingCount++;
        }
      });

      const teacherName = cls.teacherFirstName ? `${cls.teacherFirstName} ${cls.teacherLastName}` : 'Unassigned';

      return {
        classId: cls.id,
        className: cls.name,
        levelCategory: cls.levelCategory,
        isJunior: isJuniorSecondaryClass(cls as any),
        classTeacher: teacherName,
        roleInClass: managedClassIds.has(cls.id) ? 'CLASS_TEACHER' : 'SUBJECT_TEACHER',
        enrolledCount: Math.max(enrolledCount, testedCount),
        testedCount,
        totalScores: clsScores.length,
        classAverage,
        highestMark,
        lowestMark: clsScores.length > 0 ? lowestMark : 0,
        rubric: { EE: ee, ME: me, AE: ae, BE: be },
        topStudent,
        strugglingCount,
      };
    });

    // Rank classes by classAverage descending
    classSummaries.sort((a, b) => b.classAverage - a.classAverage);
    const rankedClassSummaries = classSummaries.map((cls, idx) => ({
      ...cls,
      rank: idx + 1,
    }));

    // 7. Top Achievers Honor Roll (Schoolwide Merit List)
    const allRankedStudents = Array.from(globalStudentMap.values())
      .map((s) => {
        const avg = s.subjectsCount > 0 ? Math.round((s.totalMarks / s.subjectsCount) * 10) / 10 : 0;
        let proficiencyLevel = 'ME';
        if (avg >= 75) proficiencyLevel = 'EE';
        else if (avg >= 50) proficiencyLevel = 'ME';
        else if (avg >= 40) proficiencyLevel = 'AE';
        else proficiencyLevel = 'BE';

        return {
          ...s,
          averageScore: avg,
          proficiencyLevel,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);

    const honorRoll = allRankedStudents.slice(0, 25).map((s, idx) => ({
      ...s,
      rank: idx + 1,
    }));

    // 8. Academic Intervention & Remedial Watchlist
    const remedialWatchlist = Array.from(globalRemedialMap.values())
      .map((r) => {
        const fullProfile = globalStudentMap.get(r.studentId);
        const overallAvg =
          fullProfile && fullProfile.subjectsCount > 0
            ? Math.round((fullProfile.totalMarks / fullProfile.subjectsCount) * 10) / 10
            : 0;
        const failingCount = r.failingSubjects.length;
        const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
          failingCount >= 3 ? 'HIGH' : failingCount >= 2 ? 'MEDIUM' : 'LOW';

        return {
          studentId: r.studentId,
          studentName: r.studentName,
          assessmentNumber: r.assessmentNumber || r.admissionNumber || '—',
          admissionNumber: r.assessmentNumber || r.admissionNumber || '—',
          classId: r.classId,
          className: r.className,
          classTeacher: r.classTeacher,
          overallAverage: overallAvg,
          failingCount,
          riskLevel,
          failingSubjects: r.failingSubjects,
        };
      })
      .sort((a, b) => b.failingCount - a.failingCount || a.overallAverage - b.overallAverage);

    // Backward compatible intervention learners flat list
    const interventionLearners = viewScores
      .filter((r) => parseFloat(r.score.marksObtained) < 50)
      .map((r) => {
        const isJunior = isJuniorSecondaryClass(r.class);
        const marks = parseFloat(r.score.marksObtained);
        return {
          scoreId: r.score.id,
          studentId: r.student.id,
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          assessmentNumber: r.student.assessmentNumber || r.student.admissionNumber || '—',
          admissionNumber: r.student.assessmentNumber || r.student.admissionNumber || '—',
          className: r.class.name,
          subjectName: r.subject.name,
          marksObtained: marks,
          isJunior,
          rubric: isJunior ? null : (r.score.cbcRubricLevel || calculateCbcRubric(marks, 100).code),
          points: isJunior ? (r.score.juniorPoints ?? calculateJuniorPoints(marks, 100)) : null,
          remarks: r.score.teacherRemarks || 'Needs remedial attention',
        };
      });

    // 9. Specific Class Drill-Down (if requested or defaulted)
    let selectedClassDetail: any = null;
    const drilldownClassId = classId || targetClassId;
    if (drilldownClassId) {
      const clsScores = authorizedScores.filter((r) => r.class.id === drilldownClassId);
      const studentScoreMap = new Map<string, any>();
      const targetCls = allClasses.find((c) => c.id === drilldownClassId);
      const isJunior = isJuniorSecondaryClass(targetCls as any);

      clsScores.forEach((r) => {
        if (!studentScoreMap.has(r.student.id)) {
          studentScoreMap.set(r.student.id, {
            studentId: r.student.id,
            studentName: `${r.student.firstName} ${r.student.lastName}`,
            assessmentNumber: r.student.assessmentNumber || r.student.admissionNumber || '—',
            admissionNumber: r.student.assessmentNumber || r.student.admissionNumber || '—',
            subjects: [],
            totalMarks: 0,
          });
        }
        const sObj = studentScoreMap.get(r.student.id);
        const marks = parseFloat(r.score.marksObtained);
        sObj.subjects.push({
          subjectId: r.subject.id,
          subjectName: r.subject.name,
          subjectCode: r.subject.code,
          score: marks,
          maxMarks: r.score.maxMarks || 100,
          rubric: r.score.cbcRubricLevel || calculateCbcRubric(marks, r.score.maxMarks || 100).code,
          points: isJunior ? (r.score.juniorPoints ?? calculateJuniorPoints(marks, r.score.maxMarks || 100)) : null,
          remarks: r.score.teacherRemarks || '',
        });
        sObj.totalMarks += marks;
      });

      const studentRankings = Array.from(studentScoreMap.values()).map((s) => ({
        ...s,
        average: s.subjects.length > 0 ? Math.round((s.totalMarks / s.subjects.length) * 10) / 10 : 0,
      }));

      studentRankings.sort((a, b) => b.average - a.average);

      selectedClassDetail = {
        classId: drilldownClassId,
        className: targetCls?.name || 'Class Drill-Down',
        isJunior,
        gradingType: isJunior ? 'POINTS' : 'RUBRIC',
        isClassTeacherScope: isLeadership || managedClassIds.has(drilldownClassId),
        students: studentRankings.map((s, idx) => ({ ...s, rank: idx + 1 })),
      };
    }

    const userScope = {
      role: isLeadership
        ? 'LEADERSHIP'
        : managedClassIds.size > 0 && allocatedClassSubjectPairs.size > 0
        ? 'DUAL_ROLE'
        : managedClassIds.size > 0
        ? 'CLASS_TEACHER'
        : 'SUBJECT_TEACHER',
      isLeadership,
      isClassTeacher: managedClassIds.size > 0,
      isSubjectTeacher: allocatedClassSubjectPairs.size > 0,
      managedClassIds: Array.from(managedClassIds),
      allocatedClassIds: Array.from(allocatedClassIds),
      defaultClassId: targetClassId || null,
    };

    const targetClassRecord = targetClassId ? allClasses.find((c) => c.id === targetClassId) : null;
    const topStudentOverall = allRankedStudents.length > 0 ? allRankedStudents[0] : null;

    return {
      examsList: allExams.map((e) => ({
        id: e.exam.id,
        title: e.exam.title,
        status: e.exam.status,
        termName: `Term ${e.term.termNumber} (${e.term.year})`,
      })),
      selectedExam: targetExamRecord
        ? {
            id: targetExamRecord.exam.id,
            title: targetExamRecord.exam.title,
            status: targetExamRecord.exam.status,
            termName: `Term ${targetExamRecord.term.termNumber} (${targetExamRecord.term.year})`,
          }
        : null,
      schoolOverview: {
        schoolAverage,
        totalLearnersTested: totalSat,
        totalEnrolled,
        absentCount,
        candidacyRate,
        totalScoresEntered: totalScoresCount,
        topSubject: topSubject ? { name: topSubject.subjectName, average: topSubject.averageScore } : null,
        lowestSubject: lowestSubject ? { name: lowestSubject.subjectName, average: lowestSubject.averageScore } : null,
        topStream: isLeadership && !targetClassId
          ? (rankedClassSummaries.length > 0 ? { name: rankedClassSummaries[0].className, average: rankedClassSummaries[0].classAverage } : null)
          : null,
        topStudent: topStudentOverall ? { name: topStudentOverall.studentName, average: topStudentOverall.averageScore } : null,
        lowestStudent: allRankedStudents.length > 0 ? {
          name: allRankedStudents[allRankedStudents.length - 1].studentName,
          average: allRankedStudents[allRankedStudents.length - 1].averageScore,
          rank: allRankedStudents.length,
        } : null,
        rubricDistribution: { EE: eeTotal, ME: meTotal, AE: aeTotal, BE: beTotal },
        rubricPercentages: { EE: eeRate, ME: meRate, AE: aeRate, BE: beRate },
        proficiencyBenchmark,
        pointsDistribution: pointsTotal,
        strugglingTotal: remedialWatchlist.length,
        isClassScoped: !isLeadership || Boolean(targetClassId),
        className: targetClassRecord?.name || null,
        scopeType: isLeadership
          ? (targetClassId ? 'CLASS' : 'SCHOOLWIDE')
          : (targetClassId && managedClassIds.has(targetClassId) ? 'CLASS' : 'SUBJECT'),
      },
      subjects: subjectSummaries,
      classes: rankedClassSummaries,
      honorRoll,
      remedialWatchlist,
      interventionLearners,
      selectedClassDetail,
      userScope,
    };
  }

  static async getAcademicInsights(examId?: string, user?: AuthenticatedUser) {
    const analysis = await this.getExamAnalysis(examId, undefined, user);
    const insights: Array<{ type: 'ALERT' | 'INFO' | 'ACHIEVEMENT' | 'ACTION'; title: string; message: string }> = [];

    // Insight 1: Subject Bottlenecks
    const strugglingSubjects = analysis.subjects.filter((s) => s.needsAttention && s.testedCount > 0);
    if (strugglingSubjects.length > 0) {
      strugglingSubjects.forEach((sub) => {
        insights.push({
          type: 'ALERT',
          title: `Academic Focus: ${sub.subjectName}`,
          message: `${sub.subjectName} recorded an average of ${sub.averageScore}%, with ${sub.rubric.BE} learner(s) performing Below Expectations. Recommend remedial homework and targeted departmental review.`,
        });
      });
    }

    // Insight 2: Top Academic Achievement
    if (analysis.schoolOverview.topSubject) {
      insights.push({
        type: 'ACHIEVEMENT',
        title: `Top Performing Learning Area: ${analysis.schoolOverview.topSubject.name}`,
        message: `${analysis.schoolOverview.topSubject.name} achieved the school-wide highest average of ${analysis.schoolOverview.topSubject.average}%. commend subject teachers during staff meeting.`,
      });
    }

    // Insight 3: Intervention Summary for Staff Meeting
    const strugglingCount = analysis.interventionLearners.length;
    if (strugglingCount > 0) {
      insights.push({
        type: 'ACTION',
        title: `${strugglingCount} Learners Below 50% Threshold`,
        message: `Across active classes, ${strugglingCount} learner subject test score(s) are below the academic passing threshold (50%). Priority intervention list compiled for subject teachers.`,
      });
    } else {
      insights.push({
        type: 'ACHIEVEMENT',
        title: 'Strong Academic Retention',
        message: 'No learners scored below the critical 50% passing threshold in recorded examinations.',
      });
    }

    // Insight 4: Class Ranking Highlights
    const activeClasses = analysis.classes.filter((c) => c.testedCount > 0);
    if (activeClasses.length > 1) {
      activeClasses.sort((a, b) => b.classAverage - a.classAverage);
      const topCls = activeClasses[0];
      const botCls = activeClasses[activeClasses.length - 1];

      insights.push({
        type: 'INFO',
        title: `Class Stream Comparison: ${topCls.className} vs ${botCls.className}`,
        message: `${topCls.className} leads with a ${topCls.classAverage}% average, while ${botCls.className} recorded ${botCls.classAverage}%. Consider peer lesson observations between class teachers.`,
      });
    }

    // Fetch school name and current term
    const [settings] = await db.select().from(systemSettings).limit(1);
    const [currentTerm] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));

    return {
      exam: analysis.selectedExam,
      schoolName: settings?.schoolName || 'Eldoret Muslim Academy',
      academicYear: settings?.currentAcademicYear || 2026,
      currentTermNumber: currentTerm?.termNumber || 1,
      schoolOverview: analysis.schoolOverview,
      insights,
      actionableRecommendations: [
        'Organize targeted remedial clinics for learners scoring below 50% in mathematics & science areas.',
        'Share high-performing teaching methodologies from top subject teachers in next staff briefing.',
        'Schedule parent-teacher academic review sessions for learners with multiple Below Expectations marks.',
      ],
    };
  }

  static async getSubjectPerformance(
    examId?: string,
    subjectId?: string,
    classId?: string,
    user?: AuthenticatedUser,
    compareExamId?: string
  ) {
    const isLeadership = !user || ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'DOS'].includes(user.roleName || '');

    // 1. Fetch all subjects and classes
    const [allSubjects, allClasses] = await Promise.all([
      db.select().from(subjects).where(isNull(subjects.deletedAt)).orderBy(subjects.name),
      db.select().from(classes).where(isNull(classes.deletedAt)).orderBy(classes.numericOrder, classes.name),
    ]);

    const classMap = new Map(allClasses.map((c) => [c.id, c]));
    const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));

    // Helper: strip level prefixes UP-, LP-, JSS-, PPE-
    const cleanSubjectCode = (code?: string | null, name?: string | null): string => {
      const raw = code || name || 'SUBJ';
      return raw.replace(/^(UP-|LP-|JSS-|PPE-)/i, '').trim() || raw;
    };

    // 2. Resolve teacher's allocations (Source of Truth: teacher_subject_allocations & marking_allocations)
    let userAllocations: Array<{ classId: string; subjectId: string }> = [];

    if (user) {
      const [teacherAllocs, markingAllocs] = await Promise.all([
        db
          .select({
            classId: teacherSubjectAllocations.classId,
            subjectId: teacherSubjectAllocations.subjectId,
          })
          .from(teacherSubjectAllocations)
          .where(
            and(
              eq(teacherSubjectAllocations.teacherId, user.id),
              isNull(teacherSubjectAllocations.deletedAt)
            )
          ),
        db
          .select({
            classId: markingAllocations.classId,
            subjectId: markingAllocations.subjectId,
          })
          .from(markingAllocations)
          .where(
            and(
              eq(markingAllocations.teacherId, user.id),
              isNull(markingAllocations.deletedAt)
            )
          ),
      ]);

      const pairSet = new Set<string>();
      for (const a of [...teacherAllocs, ...markingAllocs]) {
        const key = `${a.classId}:${a.subjectId}`;
        if (!pairSet.has(key) && classMap.has(a.classId) && subjectMap.has(a.subjectId)) {
          pairSet.add(key);
          userAllocations.push({ classId: a.classId, subjectId: a.subjectId });
        }
      }
    }

    if (userAllocations.length === 0) {
      if (isLeadership) {
        // Fallback for leadership without direct subject allocations:
        // Use first subject with active allocations in the school
        const [anyAlloc] = await db
          .select({ classId: teacherSubjectAllocations.classId, subjectId: teacherSubjectAllocations.subjectId })
          .from(teacherSubjectAllocations)
          .where(isNull(teacherSubjectAllocations.deletedAt))
          .limit(1);

        if (anyAlloc && classMap.has(anyAlloc.classId) && subjectMap.has(anyAlloc.subjectId)) {
          userAllocations.push({ classId: anyAlloc.classId, subjectId: anyAlloc.subjectId });
        } else if (allClasses.length > 0 && allSubjects.length > 0) {
          userAllocations.push({ classId: allClasses[0].id, subjectId: allSubjects[0].id });
        }
      } else {
        const forbiddenError = new Error('Access denied: You do not have any active subject allocations.');
        (forbiddenError as any).statusCode = 403;
        throw forbiddenError;
      }
    }

    // Sort allocations by class numeric order ascending, then subject name
    userAllocations.sort((a, b) => {
      const clsA = classMap.get(a.classId);
      const clsB = classMap.get(b.classId);
      const ordA = clsA?.numericOrder ?? 99;
      const ordB = clsB?.numericOrder ?? 99;
      if (ordA !== ordB) return ordA - ordB;
      const subA = subjectMap.get(a.subjectId)?.name || '';
      const subB = subjectMap.get(b.subjectId)?.name || '';
      return subA.localeCompare(subB);
    });

    // 3. Resolve Target Exam & Baseline Exam
    const allExams = await db
      .select({
        exam: examinations,
        term: academicTerms,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(academicTerms.year), desc(academicTerms.termNumber), desc(examinations.createdAt));

    // Query which exams have recorded scores
    const scoreCounts = await db
      .select({
        examId: examScores.examId,
        scoreCount: count(examScores.id),
      })
      .from(examScores)
      .where(isNull(examScores.deletedAt))
      .groupBy(examScores.examId);

    const scoreCountMap = new Map(scoreCounts.map((s) => [s.examId, Number(s.scoreCount)]));

    let selectedExamRecord = (examId && examId !== 'latest')
      ? allExams.find((e) => e.exam.id === examId)
      : null;

    if (!selectedExamRecord && allExams.length > 0) {
      // Default to the latest examination that has calculated results / terminated
      selectedExamRecord = allExams.find((e) => (scoreCountMap.get(e.exam.id) || 0) > 0)
        || allExams.find((e) => e.exam.status !== 'DRAFT')
        || allExams[0];
    }

    const selectedExam = selectedExamRecord?.exam || null;
    const selectedTerm = selectedExamRecord?.term || null;

    if (!selectedExam) {
      const err: any = new Error('No examinations found in the system.');
      err.statusCode = 404;
      throw err;
    }

    // Resolve compareExam (Baseline Exam)
    let compareExam: (typeof selectedExam) | null = null;
    let compareExamRecord: (typeof allExams)[0] | null = null;
    if (selectedExam) {
      const currIdx = allExams.findIndex((e) => e.exam.id === selectedExam.id);
      if (compareExamId && compareExamId !== 'auto' && compareExamId !== 'none') {
        compareExamRecord = allExams.find((e) => e.exam.id === compareExamId) || null;
        compareExam = compareExamRecord?.exam || null;
      } else if (compareExamId !== 'none' && currIdx >= 0 && currIdx + 1 < allExams.length) {
        compareExamRecord = allExams[currIdx + 1];
        compareExam = compareExamRecord.exam;
      }
    }

    // 4. Resolve Active Selected Allocation
    let selectedAlloc = userAllocations[0];
    if (classId && subjectId) {
      const found = userAllocations.find((a) => a.classId === classId && a.subjectId === subjectId);
      if (found) selectedAlloc = found;
    } else if (classId) {
      const found = userAllocations.find((a) => a.classId === classId);
      if (found) selectedAlloc = found;
    } else if (subjectId) {
      const found = userAllocations.find((a) => a.subjectId === subjectId);
      if (found) selectedAlloc = found;
    }

    const selectedClass = classMap.get(selectedAlloc.classId) || allClasses[0];
    const selectedSubject = subjectMap.get(selectedAlloc.subjectId) || allSubjects[0];
    const isJunior = isJuniorSecondaryClass(selectedClass as any);

    // 5. Batch Fetch Data for All Allocations (Enrolled Students, Current Scores, Baseline Scores)
    const allocatedClassIds = [...new Set(userAllocations.map((a) => a.classId))];
    const allocatedSubjectIds = [...new Set(userAllocations.map((a) => a.subjectId))];

    const activeStudents = allocatedClassIds.length > 0
      ? await db
          .select({
            id: students.id,
            classId: students.classId,
            firstName: students.firstName,
            lastName: students.lastName,
            admissionNumber: students.admissionNumber,
            assessmentNumber: students.assessmentNumber,
          })
          .from(students)
          .where(
            and(
              eq(students.status, 'ACTIVE'),
              isNull(students.deletedAt),
              inArray(students.classId, allocatedClassIds)
            )
          )
          .orderBy(students.admissionNumber)
      : [];

    const examScoreRows = (selectedExam && allocatedSubjectIds.length > 0 && allocatedClassIds.length > 0)
      ? await db
          .select({
            id: examScores.id,
            studentId: examScores.studentId,
            subjectId: examScores.subjectId,
            marksObtained: examScores.marksObtained,
            cbcRubricLevel: examScores.cbcRubricLevel,
            juniorPoints: examScores.juniorPoints,
            teacherRemarks: examScores.teacherRemarks,
          })
          .from(examScores)
          .innerJoin(students, eq(examScores.studentId, students.id))
          .where(
            and(
              eq(examScores.examId, selectedExam.id),
              inArray(examScores.subjectId, allocatedSubjectIds),
              inArray(students.classId, allocatedClassIds),
              isNull(examScores.deletedAt)
            )
          )
      : [];

    const baselineScoreRows = (compareExam && allocatedSubjectIds.length > 0 && allocatedClassIds.length > 0)
      ? await db
          .select({
            id: examScores.id,
            studentId: examScores.studentId,
            subjectId: examScores.subjectId,
            marksObtained: examScores.marksObtained,
            juniorPoints: examScores.juniorPoints,
          })
          .from(examScores)
          .innerJoin(students, eq(examScores.studentId, students.id))
          .where(
            and(
              eq(examScores.examId, compareExam.id),
              inArray(examScores.subjectId, allocatedSubjectIds),
              inArray(students.classId, allocatedClassIds),
              isNull(examScores.deletedAt)
            )
          )
      : [];

    // 6. Compute Teacher Allocations (Interactive Switcher & Benchmark Strip)
    const teacherAllocations = userAllocations.map((alloc) => {
      const cls = classMap.get(alloc.classId)!;
      const subj = subjectMap.get(alloc.subjectId)!;
      const allocIsJunior = isJuniorSecondaryClass(cls as any);
      const clsStudents = activeStudents.filter((s) => s.classId === alloc.classId);
      const clsStudentIds = new Set(clsStudents.map((s) => s.id));
      const clsScores = examScoreRows.filter((r) => r.subjectId === alloc.subjectId && clsStudentIds.has(r.studentId));
      const clsBaseScores = baselineScoreRows.filter((r) => r.subjectId === alloc.subjectId && clsStudentIds.has(r.studentId));

      const totalEnrolled = clsStudents.length;
      const totalSat = clsScores.length;
      let marksSum = 0;
      let pointsSum = 0;
      let eeCount = 0;
      let meCount = 0;
      let juniorPassCount = 0;

      for (const sc of clsScores) {
        const m = parseFloat(sc.marksObtained as any) || 0;
        marksSum += m;
        const rub = calculateCbcRubric(m, 100);
        if (rub.code === 'EE') eeCount++;
        else if (rub.code === 'ME') meCount++;

        const pts = sc.juniorPoints ?? calculateJuniorPoints(m, 100);
        pointsSum += pts;
        if (pts >= 5) juniorPassCount++;
      }

      const averageScore = totalSat > 0 ? Math.round((marksSum / totalSat) * 10) / 10 : 0;
      const juniorPointsAvg = totalSat > 0 ? Math.round((pointsSum / totalSat) * 10) / 10 : 0;

      // Base comparison
      let baseAvg: number | null = null;
      if (clsBaseScores.length > 0) {
        const baseSum = clsBaseScores.reduce((acc, r) => acc + (parseFloat(r.marksObtained as any) || 0), 0);
        baseAvg = Math.round((baseSum / clsBaseScores.length) * 10) / 10;
      }
      const deltaScore = (totalSat > 0 && baseAvg !== null) ? +(averageScore - baseAvg).toFixed(1) : null;

      let rubricOrPointsLabel = 'No marks';
      let proficiencyRate = 0;

      if (totalSat > 0) {
        if (allocIsJunior) {
          const ptRubric = juniorPointsAvg >= 7 ? 'EE' : juniorPointsAvg >= 5 ? 'ME' : juniorPointsAvg >= 3 ? 'AE' : 'BE';
          rubricOrPointsLabel = `${juniorPointsAvg} pts (${ptRubric})`;
          proficiencyRate = Math.round((juniorPassCount / totalSat) * 100);
        } else {
          const rub = calculateCbcRubric(averageScore, 100).code;
          rubricOrPointsLabel = `${averageScore}% (${rub})`;
          proficiencyRate = Math.round(((eeCount + meCount) / totalSat) * 100);
        }
      }

      return {
        allocationId: `${alloc.classId}:${alloc.subjectId}`,
        classId: alloc.classId,
        className: cls.name,
        levelCategory: cls.levelCategory,
        isJunior: allocIsJunior,
        numericOrder: cls.numericOrder ?? 99,
        subjectId: alloc.subjectId,
        subjectName: subj.name,
        subjectCode: cleanSubjectCode(subj.code, subj.name),
        fullSubjectCode: subj.code || subj.name,
        totalEnrolled,
        totalSat,
        hasMarks: totalSat > 0,
        averageScore,
        juniorPointsAvg,
        deltaScore,
        proficiencyRate,
        rubricOrPointsLabel,
      };
    });

    // 7. Compute Selected Allocation Marksheet & Detailed Diagnostics
    const selectedClassStudents = activeStudents.filter((s) => s.classId === selectedAlloc.classId);
    const selectedStudentIds = new Set(selectedClassStudents.map((s) => s.id));
    const currentClassScores = examScoreRows.filter((r) => r.subjectId === selectedAlloc.subjectId && selectedStudentIds.has(r.studentId));
    const baselineClassScores = baselineScoreRows.filter((r) => r.subjectId === selectedAlloc.subjectId && selectedStudentIds.has(r.studentId));

    // Baseline ranking map
    const baseRankMap = new Map<string, { rank: number; marks: number }>();
    if (baselineClassScores.length > 0) {
      const sortedBase = [...baselineClassScores].sort((a, b) => (parseFloat(b.marksObtained as any) || 0) - (parseFloat(a.marksObtained as any) || 0));
      sortedBase.forEach((r, idx) => {
        baseRankMap.set(r.studentId, {
          rank: idx + 1,
          marks: parseFloat(r.marksObtained as any) || 0,
        });
      });
    }

    // CAT assessments and scores for this class & subject in the selected term
    let overallCatAverage: number | null = null;
    const studentCatMap = new Map<string, number>();

    if (selectedExam && selectedTerm) {
      const termCats = await db
        .select({
          id: catAssessments.id,
          catNumber: catAssessments.catNumber,
          maxMarks: catAssessments.maxMarks,
        })
        .from(catAssessments)
        .where(
          and(
            eq(catAssessments.termId, selectedExam.termId),
            eq(catAssessments.classId, selectedAlloc.classId),
            eq(catAssessments.subjectId, selectedAlloc.subjectId),
            isNull(catAssessments.deletedAt)
          )
        );

      const catIds = termCats.map((c) => c.id);
      if (catIds.length > 0 && selectedClassStudents.length > 0) {
        const catScoresList = await db
          .select({
            catId: catScores.catId,
            studentId: catScores.studentId,
            marksObtained: catScores.marksObtained,
          })
          .from(catScores)
          .where(
            and(
              inArray(catScores.catId, catIds),
              inArray(catScores.studentId, [...selectedStudentIds]),
              isNull(catScores.deletedAt)
            )
          );

        const catAssessmentMap = new Map(termCats.map((c) => [c.id, c]));
        const studentCatListMap = new Map<string, number[]>();
        let catMarksSum = 0;
        let catMarksCount = 0;

        for (const cs of catScoresList) {
          const cat = catAssessmentMap.get(cs.catId);
          if (!cat) continue;
          const marks = typeof cs.marksObtained === 'number' ? cs.marksObtained : parseFloat(cs.marksObtained as any) || 0;
          const normalizedPct = cat.maxMarks > 0 ? (marks / cat.maxMarks) * 100 : marks;

          if (!studentCatListMap.has(cs.studentId)) studentCatListMap.set(cs.studentId, []);
          studentCatListMap.get(cs.studentId)!.push(normalizedPct);

          catMarksSum += normalizedPct;
          catMarksCount++;
        }

        if (catMarksCount > 0) {
          overallCatAverage = Math.round((catMarksSum / catMarksCount) * 10) / 10;
        }

        for (const [sId, list] of studentCatListMap.entries()) {
          if (list.length > 0) {
            const avg = list.reduce((a, b) => a + b, 0) / list.length;
            studentCatMap.set(sId, Math.round(avg * 10) / 10);
          }
        }
      }
    }

    // Submission Status
    let submissionStatus: 'SUBMITTED' | 'DRAFT' | 'PENDING' = 'PENDING';
    if (selectedExam) {
      const [submission] = await db
        .select({
          status: markSubmissions.status,
        })
        .from(markSubmissions)
        .where(
          and(
            eq(markSubmissions.examId, selectedExam.id),
            eq(markSubmissions.classId, selectedAlloc.classId),
            eq(markSubmissions.subjectId, selectedAlloc.subjectId),
            isNull(markSubmissions.deletedAt)
          )
        )
        .limit(1);

      if (submission?.status === 'APPROVED' || submission?.status === 'SUBMITTED') {
        submissionStatus = 'SUBMITTED';
      } else if (currentClassScores.length > 0) {
        submissionStatus = 'DRAFT';
      }
    }

    // Calculate class subject mean
    const scoreByStudentId = new Map(currentClassScores.map((s) => [s.studentId, s]));
    let totalMarksSum = 0;
    let totalPointsSum = 0;
    let highestScore = 0;
    let lowestScore = currentClassScores.length > 0 ? 100 : 0;
    let eeCount = 0;
    let meCount = 0;
    let aeCount = 0;
    let beCount = 0;
    const pointsSpread: Record<number, number> = { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    for (const sc of currentClassScores) {
      const marks = parseFloat(sc.marksObtained as any) || 0;
      totalMarksSum += marks;
      if (marks > highestScore) highestScore = marks;
      if (marks < lowestScore) lowestScore = marks;

      const rub = calculateCbcRubric(marks, 100);
      if (rub.code === 'EE') eeCount++;
      else if (rub.code === 'ME') meCount++;
      else if (rub.code === 'AE') aeCount++;
      else beCount++;

      const pts = sc.juniorPoints ?? calculateJuniorPoints(marks, 100);
      totalPointsSum += pts;
      if (pts in pointsSpread) pointsSpread[pts]++;
    }

    const totalSat = currentClassScores.length;
    const totalEnrolled = selectedClassStudents.length;
    const absentCount = Math.max(0, totalEnrolled - totalSat);
    const averageScore = totalSat > 0 ? Math.round((totalMarksSum / totalSat) * 10) / 10 : null;
    const juniorPointsAvg = totalSat > 0 ? Math.round((totalPointsSum / totalSat) * 10) / 10 : null;
    const proficiencyRate = totalSat > 0
      ? isJunior
        ? Math.round(((pointsSpread[8] + pointsSpread[7] + pointsSpread[6] + pointsSpread[5]) / totalSat) * 100)
        : Math.round(((eeCount + meCount) / totalSat) * 100)
      : 0;

    // Delta vs baseline exam for selected class
    let baseClassAvg: number | null = null;
    if (baselineClassScores.length > 0) {
      const baseSum = baselineClassScores.reduce((acc, r) => acc + (parseFloat(r.marksObtained as any) || 0), 0);
      baseClassAvg = Math.round((baseSum / baselineClassScores.length) * 10) / 10;
    }
    const deltaScore = (totalSat > 0 && averageScore !== null && baseClassAvg !== null) ? +(averageScore - baseClassAvg).toFixed(1) : null;
    const catGap = (overallCatAverage !== null && totalSat > 0 && averageScore !== null) ? +(averageScore - overallCatAverage).toFixed(1) : null;

    // Build Marksheet Rows
    const isExamPending = totalSat === 0;
    const marksheetRows = selectedClassStudents.map((stu) => {
      const sc = scoreByStudentId.get(stu.id);
      const baseInfo = baseRankMap.get(stu.id) || null;
      const catAvg = studentCatMap.has(stu.id) ? studentCatMap.get(stu.id)! : null;

      if (!sc) {
        return {
          studentId: stu.id,
          studentName: `${stu.firstName} ${stu.lastName}`,
          admissionNumber: stu.admissionNumber,
          assessmentNumber: stu.assessmentNumber || '—',
          marksObtained: null,
          maxMarks: 100,
          catAverage: catAvg,
          prevMarks: baseInfo ? baseInfo.marks : null,
          deltaMarks: null,
          deltaRank: null,
          rubric: null,
          rubricLabel: null,
          points: null,
          pointsLabel: null,
          diffFromClassMean: null,
          remarks: isExamPending ? '—' : 'Absent',
          isAbsent: !isExamPending,
          isPending: isExamPending,
          rank: null as number | null,
        };
      }

      const marks = parseFloat(sc.marksObtained as any) || 0;
      const prevMarks = baseInfo ? baseInfo.marks : null;
      const deltaMarks = prevMarks !== null ? +(marks - prevMarks).toFixed(1) : null;
      const diffFromClassMean = averageScore !== null ? +(marks - averageScore).toFixed(1) : null;

      const rub = calculateCbcRubric(marks, 100);
      const pts = sc.juniorPoints ?? calculateJuniorPoints(marks, 100);
      const ptsLabel = isJunior
        ? `${pts} pts · ${pts >= 7 ? 'EE' : pts >= 5 ? 'ME' : pts >= 3 ? 'AE' : 'BE'}${pts % 2 === 0 ? '1' : '2'}`
        : null;

      return {
        studentId: stu.id,
        studentName: `${stu.firstName} ${stu.lastName}`,
        admissionNumber: stu.admissionNumber,
        assessmentNumber: stu.assessmentNumber || '—',
        marksObtained: marks,
        maxMarks: 100,
        catAverage: catAvg,
        prevMarks,
        deltaMarks,
        deltaRank: null as number | null,
        rubric: rub.code,
        rubricLabel: rub.label,
        points: isJunior ? pts : null,
        pointsLabel: ptsLabel,
        diffFromClassMean,
        remarks: sc.teacherRemarks || '',
        isAbsent: false,
        isPending: false,
        rank: null as number | null,
      };
    });

    // Rank tested students descending by marksObtained
    const testedRows = marksheetRows.filter((r) => !r.isAbsent && !r.isPending && r.marksObtained !== null);
    testedRows.sort((a, b) => (b.marksObtained ?? 0) - (a.marksObtained ?? 0));
    testedRows.forEach((r, idx) => {
      r.rank = idx + 1;
      const baseInfo = baseRankMap.get(r.studentId);
      if (baseInfo?.rank) {
        // Delta rank: positive means moved up in ranking (e.g. was #4 now #2 -> +2)
        r.deltaRank = baseInfo.rank - r.rank;
      }
    });

    const absentRows = marksheetRows.filter((r) => r.isAbsent || r.isPending || r.marksObtained === null);
    const finalMarksheet = [...testedRows, ...absentRows];

    // Filter categories
    const remedialLearners = totalSat > 0 ? testedRows.filter((r) => {
      if (isJunior) return (r.points ?? 0) <= 4 || (r.marksObtained ?? 0) < 50;
      return (r.marksObtained ?? 0) < 50 || r.rubric === 'BE';
    }) : [];

    const topPerformers = totalSat > 0 ? testedRows.filter((r) => {
      if (isJunior) return (r.points ?? 0) >= 7 || (r.marksObtained ?? 0) >= 75;
      return (r.marksObtained ?? 0) >= 75 || r.rubric === 'EE';
    }) : [];

    const droppedLearners = totalSat > 0 ? testedRows.filter((r) => r.deltaMarks !== null && r.deltaMarks <= -3) : [];

    const topLearner = testedRows.length > 0 ? testedRows[0] : null;
    const lowestLearner = testedRows.length > 0 ? testedRows[testedRows.length - 1] : null;

    // 8. Fetch Subject Target Mean for this exam, class, and subject
    const targetRows = await db
      .select({
        id: subjectExamTargets.id,
        targetMeanPercentage: subjectExamTargets.targetMeanPercentage,
        targetMeanPoints: subjectExamTargets.targetMeanPoints,
        notes: subjectExamTargets.notes,
        setById: subjectExamTargets.setById,
        createdAt: subjectExamTargets.createdAt,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(subjectExamTargets)
      .leftJoin(users, eq(subjectExamTargets.setById, users.id))
      .where(
        and(
          eq(subjectExamTargets.examId, selectedExam.id),
          eq(subjectExamTargets.classId, selectedAlloc.classId),
          eq(subjectExamTargets.subjectId, selectedAlloc.subjectId),
          isNull(subjectExamTargets.deletedAt)
        )
      )
      .limit(1);

    const targetRow = targetRows[0] || null;
    const rawTargetPct = targetRow ? parseFloat(targetRow.targetMeanPercentage as any) : null;
    const rawTargetPoints = targetRow && targetRow.targetMeanPoints ? parseFloat(targetRow.targetMeanPoints as any) : null;

    const now = new Date();
    const selectedStartDate = selectedExam.startDate ? new Date(selectedExam.startDate) : null;
    const selectedExamHasStarted = selectedStartDate ? selectedStartDate <= now : (selectedExam.status !== 'DRAFT');

    let wasSetBeforeExamStarted = false;
    if (targetRow) {
      if (selectedStartDate) {
        const examStartCutoff = new Date(selectedStartDate).setHours(23, 59, 59, 999);
        wasSetBeforeExamStarted = new Date(targetRow.createdAt).getTime() <= examStartCutoff;
      } else {
        wasSetBeforeExamStarted = true;
      }
    }

    const targetMeanPct = wasSetBeforeExamStarted ? rawTargetPct : null;
    const targetPoints = wasSetBeforeExamStarted ? rawTargetPoints : null;
    const diffFromTargetPct = (targetMeanPct !== null && averageScore !== null) ? +(averageScore - targetMeanPct).toFixed(1) : null;
    const isTargetMet = (targetMeanPct !== null && averageScore !== null) ? averageScore >= targetMeanPct : null;
    const setByTeacherName = targetRow && targetRow.teacherFirstName ? `${targetRow.teacherFirstName} ${targetRow.teacherLastName}` : null;

    // Identify next upcoming examination (not yet started)
    const upcomingExams = allExams.filter((e) => {
      if (e.exam.id === selectedExam.id) return false;
      const sDate = e.exam.startDate ? new Date(e.exam.startDate) : null;
      if (sDate && sDate > now) return true;
      if (e.exam.status === 'DRAFT') return true;
      return false;
    });

    upcomingExams.sort((a, b) => {
      if (a.exam.startDate && b.exam.startDate) return new Date(a.exam.startDate).getTime() - new Date(b.exam.startDate).getTime();
      return new Date(a.exam.createdAt).getTime() - new Date(b.exam.createdAt).getTime();
    });

    const nextExamRecord = upcomingExams[0] || null;
    let nextExamTarget: any = null;

    if (nextExamRecord) {
      const [nt] = await db
        .select({
          id: subjectExamTargets.id,
          targetMeanPercentage: subjectExamTargets.targetMeanPercentage,
          targetMeanPoints: subjectExamTargets.targetMeanPoints,
          notes: subjectExamTargets.notes,
        })
        .from(subjectExamTargets)
        .where(
          and(
            eq(subjectExamTargets.examId, nextExamRecord.exam.id),
            eq(subjectExamTargets.classId, selectedAlloc.classId),
            eq(subjectExamTargets.subjectId, selectedAlloc.subjectId),
            isNull(subjectExamTargets.deletedAt)
          )
        )
        .limit(1);

      if (nt) {
        nextExamTarget = {
          id: nt.id,
          targetMeanPercentage: parseFloat(nt.targetMeanPercentage as any),
          targetMeanPoints: nt.targetMeanPoints ? parseFloat(nt.targetMeanPoints as any) : null,
          notes: nt.notes || null,
        };
      }
    }

    return {
      examsList: allExams.map((e) => {
        const hasScores = (scoreCountMap.get(e.exam.id) || 0) > 0;
        return {
          id: e.exam.id,
          title: e.exam.title,
          status: e.exam.status,
          hasScores,
          startDate: e.exam.startDate,
          termName: `Term ${e.term.termNumber} (${e.term.year})`,
          label: `${e.exam.title} (Term ${e.term.termNumber} ${e.term.year})${!hasScores ? ' [Pending Marks]' : ''}`,
        };
      }),
      selectedExam: selectedExam
        ? {
            id: selectedExam.id,
            title: selectedExam.title,
            status: selectedExam.status,
            startDate: selectedExam.startDate,
            termName: selectedTerm ? `Term ${selectedTerm.termNumber} (${selectedTerm.year})` : '',
            hasStarted: selectedExamHasStarted,
          }
        : null,
      compareExam: compareExam
        ? {
            id: compareExam.id,
            title: compareExam.title,
            status: compareExam.status,
            termName: compareExamRecord?.term ? `Term ${compareExamRecord.term.termNumber} (${compareExamRecord.term.year})` : '',
          }
        : null,
      targetMean: {
        targetMeanPercentage: targetMeanPct,
        rawTargetPercentage: rawTargetPct,
        targetMeanPoints: targetPoints,
        isMet: isTargetMet,
        diffFromTarget: diffFromTargetPct,
        setByTeacherName,
        notes: targetRow?.notes || null,
        wasSetBeforeExamStarted,
        hasExamStarted: selectedExamHasStarted,
      },
      nextExam: nextExamRecord
        ? {
            id: nextExamRecord.exam.id,
            title: nextExamRecord.exam.title,
            status: nextExamRecord.exam.status,
            startDate: nextExamRecord.exam.startDate,
            termName: `Term ${nextExamRecord.term.termNumber} (${nextExamRecord.term.year})`,
            hasStarted: false,
          }
        : null,
      nextExamTarget,
      subjectsList: allSubjects
        .filter((s) => userAllocations.some((a) => a.subjectId === s.id))
        .map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        levelCategory: s.levelCategory,
      })),
      selectedSubject: {
        id: selectedSubject.id,
        name: selectedSubject.name,
        code: selectedSubject.code,
        cleanCode: cleanSubjectCode(selectedSubject.code, selectedSubject.name),
        levelCategory: selectedSubject.levelCategory,
      },
      selectedClass: {
        id: selectedClass.id,
        name: selectedClass.name,
        levelCategory: selectedClass.levelCategory,
        isJunior,
      },
      teacherAllocations,
      subjectMetrics: {
        averageScore,
        juniorPointsAvg,
        highestScore: totalSat > 0 ? highestScore : 0,
        lowestScore: totalSat > 0 ? lowestScore : 0,
        totalEnrolled,
        totalSat,
        absentCount,
        candidacyRate: totalEnrolled > 0 ? Math.round((totalSat / totalEnrolled) * 1000) / 10 : 100,
        proficiencyRate,
        deltaScore,
        catAverage: overallCatAverage,
        catGap,
        submissionStatus,
        rubricDistribution: { EE: eeCount, ME: meCount, AE: aeCount, BE: beCount },
        rubricPercentages: {
          EE: totalSat > 0 ? Math.round((eeCount / totalSat) * 100) : 0,
          ME: totalSat > 0 ? Math.round((meCount / totalSat) * 100) : 0,
          AE: totalSat > 0 ? Math.round((aeCount / totalSat) * 100) : 0,
          BE: totalSat > 0 ? Math.round((beCount / totalSat) * 100) : 0,
        },
        pointsDistribution: pointsSpread,
        topLearner,
        lowestLearner,
        remedialCount: remedialLearners.length,
      },
      remedialLearners,
      topPerformers,
      droppedLearners,
      studentsMarksheet: finalMarksheet,
      userScope: {
        isLeadership,
        isSubjectTeacher: true,
        totalAllocations: teacherAllocations.length,
      },
    };
  }

  /**
   * Sets or updates Subject Target Mean for an examination
   */
  static async setSubjectTargetMean(
    classId: string,
    subjectId: string,
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

    const isLeadership = ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'DOS'].includes(user.roleName || '');
    if (!isLeadership) {
      const [alloc] = await db
        .select()
        .from(teacherSubjectAllocations)
        .where(
          and(
            eq(teacherSubjectAllocations.teacherId, user.id),
            eq(teacherSubjectAllocations.classId, classId),
            eq(teacherSubjectAllocations.subjectId, subjectId),
            isNull(teacherSubjectAllocations.deletedAt)
          )
        )
        .limit(1);

      if (!alloc) {
        const err: any = new Error('Access denied: You are not assigned as the Subject Teacher for this class.');
        err.statusCode = 403;
        throw err;
      }
    }

    if (!body.examId || body.targetMeanPercentage === undefined || isNaN(Number(body.targetMeanPercentage))) {
      const err: any = new Error('Valid Exam ID and Target Mean Percentage are required.');
      err.statusCode = 400;
      throw err;
    }

    const [targetExam] = await db
      .select({
        id: examinations.id,
        title: examinations.title,
        startDate: examinations.startDate,
        status: examinations.status,
      })
      .from(examinations)
      .where(and(eq(examinations.id, body.examId), isNull(examinations.deletedAt)));

    if (!targetExam) {
      const err: any = new Error('Specified examination was not found.');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    const examStart = targetExam.startDate ? new Date(targetExam.startDate) : null;
    const hasStarted = examStart ? examStart <= now : targetExam.status !== 'DRAFT';

    if (hasStarted) {
      const err: any = new Error(
        `This examination (${targetExam.title}) has already started. Target expectations can only be set or modified before an examination commences.`
      );
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
      .insert(subjectExamTargets)
      .values({
        examId: body.examId,
        classId,
        subjectId,
        targetMeanPercentage: String(targetPct),
        targetMeanPoints: body.targetMeanPoints ? String(body.targetMeanPoints) : null,
        setById: user.id,
        notes: body.notes || null,
      })
      .onConflictDoUpdate({
        target: [subjectExamTargets.examId, subjectExamTargets.classId, subjectExamTargets.subjectId],
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
      message: 'Subject target mean expectation saved successfully.',
      targetMean: {
        targetMeanPercentage: targetPct,
        targetMeanPoints: body.targetMeanPoints || null,
      },
    };
  }
}

