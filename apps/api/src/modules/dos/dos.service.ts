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
  calculateCbcRubric,
  calculateJuniorPoints,
  isJuniorSecondaryClass,
  eq,
  isNull,
  and,
  desc,
  sql,
} from '@school/shared';

export class DosService {
  static async getSubjectAnalytics() {
    const subjectsList = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt))
      .orderBy(subjects.name);

    const scores = await db
      .select({
        score: examScores,
        subject: subjects,
      })
      .from(examScores)
      .innerJoin(subjects, eq(examScores.subjectId, subjects.id))
      .where(isNull(examScores.deletedAt));

    const distribution = subjectsList.map((s) => {
      const subjectScores = scores.filter((sc) => sc.subject.id === s.id);
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

  static async getExamAnalysis(examId?: string, classId?: string) {
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

    // 3. Fetch scores for this exam
    let scoresQuery = db
      .select({
        score: examScores,
        student: students,
        subject: subjects,
        class: classes,
      })
      .from(examScores)
      .innerJoin(students, eq(examScores.studentId, students.id))
      .innerJoin(subjects, eq(examScores.subjectId, subjects.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          targetExamId ? eq(examScores.examId, targetExamId) : sql`1=1`,
          isNull(examScores.deletedAt),
          isNull(students.deletedAt)
        )
      );

    const rawScores = await scoresQuery;

    // 4. Compute School-Wide Overview & Student Global Aggregates
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
      admissionNumber: string | null;
      classId: string;
      className: string;
      classTeacher: string;
      failingSubjects: { subjectName: string; marksObtained: number; rubric: string | null; points: number | null; remarks: string }[];
    }>();

    rawScores.forEach((row) => {
      const marks = parseFloat(row.score.marksObtained);
      totalMarksSum += marks;
      const sId = row.student.id;
      uniqueStudents.add(sId);

      const isJunior = isJuniorSecondaryClass(row.class);
      let rubCode: string | null = null;
      let ptsValue: number | null = null;

      if (isJunior) {
        ptsValue = row.score.juniorPoints ?? calculateJuniorPoints(marks, row.score.maxMarks || 100);
        if (ptsValue in pointsTotal) {
          pointsTotal[ptsValue]++;
        }
      } else {
        rubCode = row.score.cbcRubricLevel || calculateCbcRubric(marks, row.score.maxMarks || 100).code;
        if (rubCode === 'EE') eeTotal++;
        else if (rubCode === 'ME') meTotal++;
        else if (rubCode === 'AE') aeTotal++;
        else beTotal++;
      }

      // Populate global student map for Merit List (Honor Roll)
      if (!globalStudentMap.has(sId)) {
        globalStudentMap.set(sId, {
          studentId: sId,
          studentName: `${row.student.firstName} ${row.student.lastName}`,
          admissionNumber: row.student.admissionNumber,
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
            admissionNumber: row.student.admissionNumber,
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

    const schoolAverage = rawScores.length > 0 ? Math.round((totalMarksSum / rawScores.length) * 10) / 10 : 0;
    const totalEnrolled = activeStudents.length || uniqueStudents.size;
    const totalSat = uniqueStudents.size;
    const absentCount = Math.max(0, totalEnrolled - totalSat);
    const candidacyRate = totalEnrolled > 0 ? Math.round((totalSat / totalEnrolled) * 1000) / 10 : 100;

    const totalScoresCount = rawScores.length;
    const eeRate = totalScoresCount > 0 ? Math.round((eeTotal / totalScoresCount) * 100) : 0;
    const meRate = totalScoresCount > 0 ? Math.round((meTotal / totalScoresCount) * 100) : 0;
    const aeRate = totalScoresCount > 0 ? Math.round((aeTotal / totalScoresCount) * 100) : 0;
    const beRate = totalScoresCount > 0 ? Math.round((beTotal / totalScoresCount) * 100) : 0;
    const proficiencyBenchmark = eeRate + meRate;

    // 5. Subject Breakdown & Matrix
    const subjectSummaries = allSubjects.map((s) => {
      const subScores = rawScores.filter((r) => r.subject.id === s.id);
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

        const isJunior = isJuniorSecondaryClass(sc.class);
        if (isJunior) {
          const pts = sc.score.juniorPoints ?? calculateJuniorPoints(m, sc.score.maxMarks || 100);
          if (pts in subPoints) {
            subPoints[pts]++;
          }
        } else {
          const rub = sc.score.cbcRubricLevel || calculateCbcRubric(m, sc.score.maxMarks || 100).code;
          if (rub === 'EE') ee++;
          else if (rub === 'ME') me++;
          else if (rub === 'AE') ae++;
          else be++;
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
    const classSummaries = allClasses.map((cls) => {
      const clsScores = rawScores.filter((r) => r.class.id === cls.id);
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
            admissionNumber: entry.student.admissionNumber,
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
          admissionNumber: r.admissionNumber,
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
    const interventionLearners = rawScores
      .filter((r) => parseFloat(r.score.marksObtained) < 50)
      .map((r) => {
        const isJunior = isJuniorSecondaryClass(r.class);
        const marks = parseFloat(r.score.marksObtained);
        return {
          scoreId: r.score.id,
          studentId: r.student.id,
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          admissionNumber: r.student.admissionNumber,
          className: r.class.name,
          subjectName: r.subject.name,
          marksObtained: marks,
          isJunior,
          rubric: isJunior ? null : (r.score.cbcRubricLevel || calculateCbcRubric(marks, 100).code),
          points: isJunior ? (r.score.juniorPoints ?? calculateJuniorPoints(marks, 100)) : null,
          remarks: r.score.teacherRemarks || 'Needs remedial attention',
        };
      });

    // 9. Specific Class Drill-Down (if requested)
    let selectedClassDetail: any = null;
    if (classId) {
      const clsScores = rawScores.filter((r) => r.class.id === classId);
      const studentScoreMap = new Map<string, any>();
      const targetCls = allClasses.find((c) => c.id === classId);
      const isJunior = isJuniorSecondaryClass(targetCls as any);

      clsScores.forEach((r) => {
        if (!studentScoreMap.has(r.student.id)) {
          studentScoreMap.set(r.student.id, {
            studentId: r.student.id,
            studentName: `${r.student.firstName} ${r.student.lastName}`,
            admissionNumber: r.student.admissionNumber,
            subjects: [],
            totalMarks: 0,
          });
        }
        const sObj = studentScoreMap.get(r.student.id);
        const marks = parseFloat(r.score.marksObtained);
        sObj.subjects.push({
          subjectName: r.subject.name,
          score: marks,
          rubric: isJunior ? null : (r.score.cbcRubricLevel || calculateCbcRubric(marks, 100).code),
          points: isJunior ? (r.score.juniorPoints ?? calculateJuniorPoints(marks, 100)) : null,
        });
        sObj.totalMarks += marks;
      });

      const studentRankings = Array.from(studentScoreMap.values()).map((s) => ({
        ...s,
        average: s.subjects.length > 0 ? Math.round((s.totalMarks / s.subjects.length) * 10) / 10 : 0,
      }));

      studentRankings.sort((a, b) => b.average - a.average);

      selectedClassDetail = {
        classId,
        className: targetCls?.name || 'Class Drill-Down',
        isJunior,
        gradingType: isJunior ? 'POINTS' : 'RUBRIC',
        students: studentRankings.map((s, idx) => ({ ...s, rank: idx + 1 })),
      };
    }

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
        topStream: rankedClassSummaries.length > 0 ? { name: rankedClassSummaries[0].className, average: rankedClassSummaries[0].classAverage } : null,
        rubricDistribution: { EE: eeTotal, ME: meTotal, AE: aeTotal, BE: beTotal },
        rubricPercentages: { EE: eeRate, ME: meRate, AE: aeRate, BE: beRate },
        proficiencyBenchmark,
        pointsDistribution: pointsTotal,
        strugglingTotal: remedialWatchlist.length,
      },
      subjects: subjectSummaries,
      classes: rankedClassSummaries,
      honorRoll,
      remedialWatchlist,
      interventionLearners,
      selectedClassDetail,
    };
  }

  static async getAcademicInsights(examId?: string) {
    const analysis = await this.getExamAnalysis(examId);
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
}

