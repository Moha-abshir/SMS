import { db } from '../../config/db.js';
import {
  catAssessments,
  catScores,
  classes,
  subjects,
  academicTerms,
  students,
  teacherSubjectAllocations,
  markingAllocations,
  users,
  isNationalExamClass,
  isJuniorSecondaryClass,
  calculateCbcRubric,
  calculateJuniorPoints,
  eq,
  and,
  inArray,
  isNull,
  desc,
  asc,
  sql,
} from '@school/shared';

export interface CreateCatDto {
  classId: string;
  subjectId: string;
  catNumber: number;
  maxMarks?: number;
  termId?: string;
}

export interface SaveCatScoresDto {
  scores: Array<{
    studentId: string;
    marksObtained: number | string | null;
    remarks?: string | null;
  }>;
}

export class CatsService {
  /**
   * Fetch current or latest active academic term
   */
  static async getActiveTerm() {
    const [current] = await db
      .select()
      .from(academicTerms)
      .where(and(eq(academicTerms.isCurrent, true), isNull(academicTerms.deletedAt)))
      .limit(1);

    if (current) return current;

    const [latest] = await db
      .select()
      .from(academicTerms)
      .where(isNull(academicTerms.deletedAt))
      .orderBy(desc(academicTerms.year), desc(academicTerms.termNumber))
      .limit(1);

    return latest || null;
  }

  /**
   * Get all teaching allocations for national transition cohorts (Grades 3, 6, 9)
   * for the authenticated teacher, along with their existing CAT assessments.
   */
  static async getTeacherCatAllocations(userId: string) {
    const activeTerm = await this.getActiveTerm();
    if (!activeTerm) {
      return {
        activeTerm: null,
        allocations: [],
      };
    }

    // 1. Fetch user's subject allocations
    const subjectAllocs = await db
      .select({
        classId: classes.id,
        className: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(classes, eq(teacherSubjectAllocations.classId, classes.id))
      .innerJoin(subjects, eq(teacherSubjectAllocations.subjectId, subjects.id))
      .where(
        and(
          eq(teacherSubjectAllocations.teacherId, userId),
          isNull(teacherSubjectAllocations.deletedAt),
          isNull(classes.deletedAt),
          isNull(subjects.deletedAt)
        )
      );

    // 2. Fetch classes where user is assigned as Class Teacher
    const classTeacherClasses = await db
      .select()
      .from(classes)
      .where(and(eq(classes.classTeacherId, userId), isNull(classes.deletedAt)));

    const candidateAllocations: Array<{
      classId: string;
      className: string;
      levelCategory: string;
      numericOrder: number;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
    }> = [...subjectAllocs];

    const eligibleClasses = classTeacherClasses.filter(c =>
      isNationalExamClass(c) && (c.levelCategory === 'LOWER_PRIMARY' || c.numericOrder === 6));
    const categories = [...new Set(eligibleClasses.map(c => c.levelCategory))];
    const relevantSubjects = categories.length ? await db.select().from(subjects)
      .where(and(inArray(subjects.levelCategory, categories), isNull(subjects.deletedAt))) : [];
    const allocationKeys = new Set(candidateAllocations.map(a => `${a.classId}:${a.subjectId}`));
    for (const c of eligibleClasses) {
      {
        const classSubjects = relevantSubjects.filter(s => s.levelCategory === c.levelCategory);
        for (const sub of classSubjects) {
          const key = `${c.id}:${sub.id}`;
          const exists = allocationKeys.has(key);
          if (!exists) {
            allocationKeys.add(key);
            candidateAllocations.push({
              classId: c.id,
              className: c.name,
              levelCategory: c.levelCategory,
              numericOrder: c.numericOrder,
              subjectId: sub.id,
              subjectName: sub.name,
              subjectCode: sub.code,
            });
          }
        }
      }
    }

    // 3. Filter STRICTLY for national examination transition cohorts (Grades 3, 6, 9)
    const nationalAllocations = candidateAllocations.filter((alloc) =>
      isNationalExamClass({
        name: alloc.className,
        numericOrder: alloc.numericOrder,
        levelCategory: alloc.levelCategory,
      })
    );

    if (nationalAllocations.length === 0) {
      return {
        activeTerm: {
          id: activeTerm.id,
          year: activeTerm.year,
          termNumber: activeTerm.termNumber,
        },
        allocations: [],
      };
    }

    // 4. Batch query existing CAT assessments and scores for these allocations in this term
    const classIds = Array.from(new Set(nationalAllocations.map((a) => a.classId)));
    const subjectIds = Array.from(new Set(nationalAllocations.map((a) => a.subjectId)));

    const existingCats = await db
      .select({
        id: catAssessments.id,
        termId: catAssessments.termId,
        classId: catAssessments.classId,
        subjectId: catAssessments.subjectId,
        catNumber: catAssessments.catNumber,
        maxMarks: catAssessments.maxMarks,
        createdAt: catAssessments.createdAt,
      })
      .from(catAssessments)
      .where(
        and(
          eq(catAssessments.termId, activeTerm.id),
          inArray(catAssessments.classId, classIds),
          inArray(catAssessments.subjectId, subjectIds),
          isNull(catAssessments.deletedAt)
        )
      )
      .orderBy(asc(catAssessments.catNumber));

    const catIds = existingCats.map((c) => c.id);

    // Fetch scores count and averages for these CATs
    const scores = catIds.length > 0
      ? await db
          .select({
            catId: catScores.catId,
            studentId: catScores.studentId,
            marksObtained: catScores.marksObtained,
          })
          .from(catScores)
          .where(and(inArray(catScores.catId, catIds), isNull(catScores.deletedAt)))
      : [];

    // Fetch total active students per class
    const studentCounts = await db
      .select({
        classId: students.classId,
        total: sql<number>`count(*)::int`,
      })
      .from(students)
      .where(and(inArray(students.classId, classIds), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .groupBy(students.classId);

    const studentCountMap = new Map<string, number>();
    for (const sc of studentCounts) {
      if (sc.classId) studentCountMap.set(sc.classId, sc.total);
    }

    // Map CAT scores by catId
    const scoresByCatId = new Map<string, number[]>();
    for (const s of scores) {
      const mark = typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained as any) || 0;
      if (!scoresByCatId.has(s.catId)) scoresByCatId.set(s.catId, []);
      scoresByCatId.get(s.catId)!.push(mark);
    }

    // Group CATs by `classId-subjectId`
    const catsByAlloc = new Map<string, any[]>();
    for (const cat of existingCats) {
      const key = `${cat.classId}-${cat.subjectId}`;
      const rawScores = scoresByCatId.get(cat.id) || [];
      const normalizedScores = rawScores.map((raw) => (cat.maxMarks > 0 ? (raw / cat.maxMarks) * 100 : raw));
      const meanPct =
        normalizedScores.length > 0
          ? +(normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length).toFixed(1)
          : null;

      const rubric = meanPct !== null ? calculateCbcRubric(meanPct).code : null;

      const catItem = {
        id: cat.id,
        catNumber: cat.catNumber,
        maxMarks: cat.maxMarks,
        createdAt: cat.createdAt,
        scoredStudents: rawScores.length,
        totalStudents: studentCountMap.get(cat.classId) || 0,
        meanPct,
        rubric,
      };

      if (!catsByAlloc.has(key)) catsByAlloc.set(key, []);
      catsByAlloc.get(key)!.push(catItem);
    }

    // Assemble allocation response
    const allocationsResult = nationalAllocations.map((alloc) => {
      const key = `${alloc.classId}-${alloc.subjectId}`;
      const cats = catsByAlloc.get(key) || [];
      const totalStudents = studentCountMap.get(alloc.classId) || 0;

      // Calculate combined running CAT average
      const completedCats = cats.filter((c) => c.meanPct !== null);
      const runningCatAverage =
        completedCats.length > 0
          ? +(
              completedCats.reduce((acc, c) => acc + (c.meanPct as number), 0) / completedCats.length
            ).toFixed(1)
          : null;

      const isJunior = isJuniorSecondaryClass({
        name: alloc.className,
        numericOrder: alloc.numericOrder,
        levelCategory: alloc.levelCategory,
      });

      return {
        classId: alloc.classId,
        className: alloc.className,
        numericOrder: alloc.numericOrder,
        levelCategory: alloc.levelCategory,
        isJuniorSecondary: isJunior,
        subjectId: alloc.subjectId,
        subjectName: alloc.subjectName,
        subjectCode: alloc.subjectCode,
        totalStudents,
        cats,
        runningCatAverage,
        runningCatRubric:
          runningCatAverage !== null ? calculateCbcRubric(runningCatAverage).code : null,
      };
    });

    return {
      activeTerm: {
        id: activeTerm.id,
        year: activeTerm.year,
        termNumber: activeTerm.termNumber,
      },
      allocations: allocationsResult,
    };
  }

  /**
   * Create a new Continuous Assessment Test (CAT)
   */
  static async createCat(userId: string, data: CreateCatDto) {
    const { classId, subjectId, catNumber, maxMarks = 100 } = data;

    // 1. Verify class exists and is a National Exam Transition Cohort (Grades 3, 6, 9)
    const [targetClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)));

    if (!targetClass) {
      throw new Error('Class not found');
    }

    if (!isNationalExamClass(targetClass)) {
      throw new Error(
        'Continuous Assessment Tests (CATs) are restricted to national examination cohorts (Grades 3, 6, and 9).'
      );
    }

    // 2. Verify subject exists
    const [targetSubject] = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), isNull(subjects.deletedAt)));

    if (!targetSubject) {
      throw new Error('Subject not found');
    }

    // 3. Resolve active term
    let termId = data.termId;
    if (!termId) {
      const activeTerm = await this.getActiveTerm();
      if (!activeTerm) {
        throw new Error('No active academic term found to attach CAT assessment to.');
      }
      termId = activeTerm.id;
    }

    // 4. Validate CAT number and maxMarks
    const parsedCatNumber = Math.max(1, Math.min(10, Math.floor(catNumber)));
    const parsedMaxMarks = Math.max(5, Math.min(1000, Math.floor(maxMarks)));

    // 5. Check if this CAT number already exists for this term, class, and subject
    const [existing] = await db
      .select()
      .from(catAssessments)
      .where(
        and(
          eq(catAssessments.termId, termId),
          eq(catAssessments.classId, classId),
          eq(catAssessments.subjectId, subjectId),
          eq(catAssessments.catNumber, parsedCatNumber),
          isNull(catAssessments.deletedAt)
        )
      );

    if (existing) {
      throw new Error(
        `CAT ${parsedCatNumber} already exists for ${targetClass.name} - ${targetSubject.name} in this term.`
      );
    }

    // 6. Insert new CAT assessment
    const [created] = await db
      .insert(catAssessments)
      .values({
        termId,
        classId,
        subjectId,
        catNumber: parsedCatNumber,
        maxMarks: parsedMaxMarks,
        createdById: userId,
      })
      .returning();

    return created;
  }

  /**
   * Get CAT Marksheet for scoring
   */
  static async getCatMarksheet(catId: string) {
    // 1. Fetch CAT with Class, Subject, and Term details
    const [cat] = await db
      .select({
        id: catAssessments.id,
        termId: catAssessments.termId,
        classId: catAssessments.classId,
        subjectId: catAssessments.subjectId,
        catNumber: catAssessments.catNumber,
        maxMarks: catAssessments.maxMarks,
        createdAt: catAssessments.createdAt,
        className: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        termNumber: academicTerms.termNumber,
        academicYear: academicTerms.year,
      })
      .from(catAssessments)
      .innerJoin(classes, eq(catAssessments.classId, classes.id))
      .innerJoin(subjects, eq(catAssessments.subjectId, subjects.id))
      .innerJoin(academicTerms, eq(catAssessments.termId, academicTerms.id))
      .where(and(eq(catAssessments.id, catId), isNull(catAssessments.deletedAt)));

    if (!cat) {
      throw new Error('CAT assessment not found or has been deleted.');
    }

    const isJunior = isJuniorSecondaryClass({
      name: cat.className,
      numericOrder: cat.numericOrder,
      levelCategory: cat.levelCategory,
    });

    // 2. Fetch all active students in the class
    const learners = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        assessmentNumber: students.assessmentNumber,
        fullName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
        gender: students.gender,
      })
      .from(students)
      .where(and(eq(students.classId, cat.classId), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .orderBy(asc(students.lastName), asc(students.firstName));

    // 3. Fetch existing CAT scores
    const scores = await db
      .select({
        studentId: catScores.studentId,
        marksObtained: catScores.marksObtained,
        remarks: catScores.remarks,
      })
      .from(catScores)
      .where(and(eq(catScores.catId, catId), isNull(catScores.deletedAt)));

    const scoreMap = new Map<string, { marksObtained: number; remarks: string | null }>();
    for (const sc of scores) {
      scoreMap.set(sc.studentId, {
        marksObtained: typeof sc.marksObtained === 'number' ? sc.marksObtained : parseFloat(sc.marksObtained as any) || 0,
        remarks: sc.remarks,
      });
    }

    // 4. Map learners with scores and calculated rubrics
    let scoredCount = 0;
    let totalMarksSum = 0;
    let highestPct = 0;
    let lowestPct = 100;
    const rubricBreakdown = { EE: 0, ME: 0, AE: 0, BE: 0 };

    const learnerRows = learners.map((l) => {
      const existingScore = scoreMap.get(l.id);
      const rawMark = existingScore ? existingScore.marksObtained : null;
      const remarks = existingScore ? existingScore.remarks : '';

      let percentage: number | null = null;
      let rubric: 'EE' | 'ME' | 'AE' | 'BE' | null = null;
      let juniorPoints: number | null = null;

      if (rawMark !== null && rawMark !== undefined) {
        percentage = cat.maxMarks > 0 ? +((rawMark / cat.maxMarks) * 100).toFixed(1) : +rawMark.toFixed(1);
        scoredCount++;
        totalMarksSum += percentage;

        if (percentage > highestPct) highestPct = percentage;
        if (percentage < lowestPct) lowestPct = percentage;

        const cbc = calculateCbcRubric(percentage);
        rubric = cbc.code;
        rubricBreakdown[cbc.code]++;

        if (isJunior) {
          juniorPoints = calculateJuniorPoints(percentage);
        }
      }

      return {
        studentId: l.id,
        admissionNumber: l.admissionNumber,
        assessmentNumber: l.assessmentNumber,
        fullName: l.fullName,
        gender: l.gender,
        marksObtained: rawMark,
        remarks: remarks || '',
        percentage,
        rubric,
        juniorPoints,
      };
    });

    const averagePct = scoredCount > 0 ? +(totalMarksSum / scoredCount).toFixed(1) : null;

    return {
      cat: {
        id: cat.id,
        termId: cat.termId,
        classId: cat.classId,
        className: cat.className,
        isJuniorSecondary: isJunior,
        subjectId: cat.subjectId,
        subjectName: cat.subjectName,
        subjectCode: cat.subjectCode,
        catNumber: cat.catNumber,
        maxMarks: cat.maxMarks,
        createdAt: cat.createdAt,
        academicYear: cat.academicYear,
        termNumber: cat.termNumber,
      },
      learners: learnerRows,
      summary: {
        totalStudents: learners.length,
        scoredStudents: scoredCount,
        averagePct,
        highestPct: scoredCount > 0 ? highestPct : null,
        lowestPct: scoredCount > 0 ? lowestPct : null,
        rubricBreakdown,
      },
    };
  }

  /**
   * Save or update marksheet scores for a CAT
   */
  static async saveCatScores(catId: string, _userId: string, data: SaveCatScoresDto) {
    const [cat] = await db
      .select()
      .from(catAssessments)
      .where(and(eq(catAssessments.id, catId), isNull(catAssessments.deletedAt)));

    if (!cat) {
      throw new Error('CAT assessment not found or has been deleted.');
    }

    const { scores } = data;
    if (!Array.isArray(scores)) {
      throw new Error('Invalid scores payload: array of learner scores expected.');
    }

    // Execute batch upsert
    await db.transaction(async (tx) => {
      for (const item of scores) {
        if (!item.studentId) continue;

        const hasMark = item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== '';
        if (!hasMark) {
          // If blank, remove existing score if any
          await tx
            .delete(catScores)
            .where(and(eq(catScores.catId, catId), eq(catScores.studentId, item.studentId)));
          continue;
        }

        const markNum =
          typeof item.marksObtained === 'number'
            ? item.marksObtained
            : parseFloat(String(item.marksObtained));
        if (isNaN(markNum) || markNum < 0 || markNum > cat.maxMarks) {
          throw new Error(
            `Mark ${item.marksObtained} is invalid. Scores must be between 0 and maximum marks (${cat.maxMarks}).`
          );
        }

        // Upsert score
        const [existing] = await tx
          .select()
          .from(catScores)
          .where(and(eq(catScores.catId, catId), eq(catScores.studentId, item.studentId)));

        if (existing) {
          await tx
            .update(catScores)
            .set({
              marksObtained: markNum.toFixed(2),
              remarks: item.remarks ? item.remarks.trim() : null,
              updatedAt: new Date(),
              deletedAt: null,
            })
            .where(eq(catScores.id, existing.id));
        } else {
          await tx.insert(catScores).values({
            catId,
            studentId: item.studentId,
            marksObtained: markNum.toFixed(2),
            remarks: item.remarks ? item.remarks.trim() : null,
          });
        }
      }
    });

    return {
      success: true,
      message: 'Continuous Assessment Test marks saved successfully.',
    };
  }

  /**
   * Delete a CAT assessment
   */
  static async deleteCat(catId: string, _userId: string) {
    const [cat] = await db
      .select()
      .from(catAssessments)
      .where(and(eq(catAssessments.id, catId), isNull(catAssessments.deletedAt)));

    if (!cat) {
      throw new Error('CAT assessment not found or already deleted.');
    }

    // Soft delete CAT and scores
    await db.transaction(async (tx) => {
      await tx
        .update(catAssessments)
        .set({ deletedAt: new Date() })
        .where(eq(catAssessments.id, catId));

      await tx
        .update(catScores)
        .set({ deletedAt: new Date() })
        .where(eq(catScores.catId, catId));
    });

    return {
      success: true,
      id: catId,
      message: `CAT ${cat.catNumber} deleted successfully.`,
    };
  }

  /**
   * Get all CATs and learner marks for a class in the current term
   * For Class Teacher and Leadership oversight
   */
  static async getClassCatsDetail(classId: string, termId?: string) {
    const [targetClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)));

    if (!targetClass) {
      throw new Error('Class not found');
    }

    let activeTermId = termId;
    if (!activeTermId) {
      const activeTerm = await this.getActiveTerm();
      if (!activeTerm) throw new Error('No active term found');
      activeTermId = activeTerm.id;
    }

    // Fetch all CAT assessments for this class in this term
    const cats = await db
      .select({
        id: catAssessments.id,
        catNumber: catAssessments.catNumber,
        maxMarks: catAssessments.maxMarks,
        subjectId: catAssessments.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        createdAt: catAssessments.createdAt,
      })
      .from(catAssessments)
      .innerJoin(subjects, eq(catAssessments.subjectId, subjects.id))
      .where(
        and(
          eq(catAssessments.classId, classId),
          eq(catAssessments.termId, activeTermId),
          isNull(catAssessments.deletedAt)
        )
      )
      .orderBy(asc(subjects.name), asc(catAssessments.catNumber));

    const catIds = cats.map((c) => c.id);

    // Fetch all active learners in class
    const learners = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        assessmentNumber: students.assessmentNumber,
        fullName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
        gender: students.gender,
      })
      .from(students)
      .where(and(eq(students.classId, classId), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .orderBy(asc(students.lastName), asc(students.firstName));

    // Fetch scores
    const scores =
      catIds.length > 0
        ? await db
            .select({
              catId: catScores.catId,
              studentId: catScores.studentId,
              marksObtained: catScores.marksObtained,
              remarks: catScores.remarks,
            })
            .from(catScores)
            .where(and(inArray(catScores.catId, catIds), isNull(catScores.deletedAt)))
        : [];

    return {
      class: targetClass,
      cats,
      learners,
      scores,
    };
  }
}
