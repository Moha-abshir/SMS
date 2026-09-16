import { db } from '../../config/db.js';
import {
  examScores,
  subjects,
  classes,
  students,
  examinations,
  academicTerms,
  systemSettings,
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
        if (marks >= 80) eeCount++;
        else if (marks >= 65) meCount++;
        else if (marks >= 50) aeCount++;
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

    // 2. Fetch all classes and subjects
    const allClasses = await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder, classes.name);

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

    // 4. Compute School-Wide Overview
    let totalMarksSum = 0;
    let eeTotal = 0;
    let meTotal = 0;
    let aeTotal = 0;
    let beTotal = 0;
    const uniqueStudents = new Set<string>();

    rawScores.forEach((row) => {
      const marks = parseFloat(row.score.marksObtained);
      totalMarksSum += marks;
      uniqueStudents.add(row.student.id);
      if (marks >= 80) eeTotal++;
      else if (marks >= 65) meTotal++;
      else if (marks >= 50) aeTotal++;
      else beTotal++;
    });

    const schoolAverage = rawScores.length > 0 ? Math.round((totalMarksSum / rawScores.length) * 10) / 10 : 0;

    // 5. Subject Breakdown
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

      subScores.forEach((sc) => {
        const m = parseFloat(sc.score.marksObtained);
        subMarksSum += m;
        if (m > highest) highest = m;
        if (m < lowest) lowest = m;
        if (m >= 80) ee++;
        else if (m >= 65) me++;
        else if (m >= 50) ae++;
        else be++;
      });

      const avg = subCount > 0 ? Math.round((subMarksSum / subCount) * 10) / 10 : 0;

      return {
        subjectId: s.id,
        subjectName: s.name,
        subjectCode: s.code,
        levelCategory: s.levelCategory,
        testedCount: subCount,
        averageScore: avg,
        highestScore: highest,
        lowestScore: lowest,
        needsAttention: subCount > 0 && (avg < 55 || (be / subCount) > 0.3),
        rubric: { EE: ee, ME: me, AE: ae, BE: be },
      };
    });

    // Determine highest and lowest performing subjects with test data
    const activeSubjects = subjectSummaries.filter((s) => s.testedCount > 0);
    activeSubjects.sort((a, b) => b.averageScore - a.averageScore);
    const topSubject = activeSubjects.length > 0 ? activeSubjects[0] : null;
    const lowestSubject = activeSubjects.length > 0 ? activeSubjects[activeSubjects.length - 1] : null;

    // 6. Class Breakdown
    const classSummaries = allClasses.map((cls) => {
      const clsScores = rawScores.filter((r) => r.class.id === cls.id);
      const studentMap = new Map<string, { student: any; scores: any[]; totalMarks: number }>();

      clsScores.forEach((r) => {
        if (!studentMap.has(r.student.id)) {
          studentMap.set(r.student.id, { student: r.student, scores: [], totalMarks: 0 });
        }
        const sEntry = studentMap.get(r.student.id)!;
        sEntry.scores.push(r);
        sEntry.totalMarks += parseFloat(r.score.marksObtained);
      });

      let clsMarksSum = 0;
      let highestMark = 0;
      let lowestMark = clsScores.length > 0 ? 100 : 0;

      clsScores.forEach((r) => {
        const m = parseFloat(r.score.marksObtained);
        clsMarksSum += m;
        if (m > highestMark) highestMark = m;
        if (m < lowestMark) lowestMark = m;
      });

      const classAverage = clsScores.length > 0 ? Math.round((clsMarksSum / clsScores.length) * 10) / 10 : 0;

      // Find top student in this class
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

      return {
        classId: cls.id,
        className: cls.name,
        levelCategory: cls.levelCategory,
        testedCount: studentMap.size,
        totalScores: clsScores.length,
        classAverage,
        highestMark,
        lowestMark: clsScores.length > 0 ? lowestMark : 0,
        topStudent,
        strugglingCount,
      };
    });

    // 7. Learners Requiring Intervention (<50% in any subject)
    const interventionLearners = rawScores
      .filter((r) => parseFloat(r.score.marksObtained) < 50)
      .map((r) => ({
        scoreId: r.score.id,
        studentId: r.student.id,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        admissionNumber: r.student.admissionNumber,
        className: r.class.name,
        subjectName: r.subject.name,
        marksObtained: parseFloat(r.score.marksObtained),
        rubric: r.score.cbcRubricLevel || 'BE',
        remarks: r.score.teacherRemarks || 'Needs remedial attention',
      }));

    // 8. Specific Class Drill-Down (if requested)
    let selectedClassDetail: any = null;
    if (classId) {
      const clsScores = rawScores.filter((r) => r.class.id === classId);
      const studentScoreMap = new Map<string, any>();

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
        sObj.subjects.push({
          subjectName: r.subject.name,
          score: parseFloat(r.score.marksObtained),
          rubric: r.score.cbcRubricLevel || 'ME',
        });
        sObj.totalMarks += parseFloat(r.score.marksObtained);
      });

      const studentRankings = Array.from(studentScoreMap.values()).map((s) => ({
        ...s,
        average: s.subjects.length > 0 ? Math.round((s.totalMarks / s.subjects.length) * 10) / 10 : 0,
      }));

      studentRankings.sort((a, b) => b.average - a.average);

      selectedClassDetail = {
        classId,
        className: allClasses.find((c) => c.id === classId)?.name || 'Class Drill-Down',
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
        totalLearnersTested: uniqueStudents.size,
        totalScoresEntered: rawScores.length,
        topSubject: topSubject ? { name: topSubject.subjectName, average: topSubject.averageScore } : null,
        lowestSubject: lowestSubject ? { name: lowestSubject.subjectName, average: lowestSubject.averageScore } : null,
        rubricDistribution: { EE: eeTotal, ME: meTotal, AE: aeTotal, BE: beTotal },
        strugglingTotal: interventionLearners.length,
      },
      subjects: subjectSummaries,
      classes: classSummaries,
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

