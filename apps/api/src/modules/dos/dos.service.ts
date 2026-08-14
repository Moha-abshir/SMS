import { db } from '../../config/db.js';
import { examScores, subjects, classes, examinations, academicTerms, systemSettings, eq, isNull, sql } from '@school/shared';

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
}
