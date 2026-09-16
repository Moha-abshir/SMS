import { db } from '../../config/db.js';
import {
  markSubmissions,
  classes,
  subjects,
  users,
  examinations,
  examScores,
  students,
  eq,
  and,
  isNull,
  desc,
} from '@school/shared';

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
      .where(and(eq(students.classId, subData.class.id), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
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

    let totalMarks = 0;
    let scoredCount = 0;
    let highestMark = 0;
    let lowestMark = 100;
    const rubricCount = { EE: 0, ME: 0, AE: 0, BE: 0 };

    const studentScores = classStudents.map((st) => {
      const sc = scoresMap.get(st.id);
      const markNum = sc ? parseFloat(sc.marksObtained) : null;
      let rubric = sc?.cbcRubricLevel || null;

      if (markNum !== null) {
        totalMarks += markNum;
        scoredCount++;
        if (markNum > highestMark) highestMark = markNum;
        if (markNum < lowestMark) lowestMark = markNum;

        if (!rubric) {
          if (markNum >= 80) rubric = 'EE';
          else if (markNum >= 65) rubric = 'ME';
          else if (markNum >= 50) rubric = 'AE';
          else rubric = 'BE';
        }

        if (rubric && (rubric in rubricCount)) {
          (rubricCount as any)[rubric]++;
        }
      }

      return {
        studentId: st.id,
        assessmentNumber: st.assessmentNumber,
        fullName: `${st.firstName} ${st.middleName || ''} ${st.lastName}`.replace(/\s+/g, ' ').trim(),
        gender: st.gender,
        marksObtained: markNum,
        maxMarks: sc?.maxMarks || 100,
        cbcRubricLevel: rubric,
        juniorPoints: sc?.juniorPoints || null,
        teacherRemarks: sc?.teacherRemarks || '',
      };
    });

    const averageMark = scoredCount > 0 ? Math.round((totalMarks / scoredCount) * 10) / 10 : 0;

    return {
      submission: subData.submission,
      class: subData.class,
      subject: subData.subject,
      examination: subData.examination,
      submittedBy: subData.submittedBy,
      summary: {
        totalStudents: classStudents.length,
        scoredStudents: scoredCount,
        averageMark,
        highestMark: scoredCount > 0 ? highestMark : 0,
        lowestMark: scoredCount > 0 ? lowestMark : 0,
        rubricBreakdown: rubricCount,
      },
      scores: studentScores,
    };
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
