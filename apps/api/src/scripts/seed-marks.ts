import 'dotenv/config';
import { db } from '../config/db.js';
import {
  examinations,
  classes,
  students,
  subjects,
  markSubmissions,
  examScores,
  teacherSubjectAllocations,
  eq,
  and,
  isNull,
  sql,
  calculateCbcRubric,
  calculateJuniorPoints,
  isJuniorSecondaryClass,
} from '@school/shared';

// Deterministic pseudo-random based on string seed
function pseudoRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 1000) / 1000;
}

const remarksByRubric = {
  EE: [
    'Outstanding concept mastery and exemplary academic dedication.',
    'Demonstrates excellent grasp of learning areas and analytical skills.',
    'Consistently exceeds expectations; highly proactive learner.',
    'Exceptional problem-solving abilities and clear presentation.',
    'Superb grasp of CBC competencies and creative application.',
  ],
  ME: [
    'Good grasp of key concepts; maintains steady effort.',
    'Meets grade-level competencies with consistent application.',
    'Shows solid comprehension and steady academic progress.',
    'Good performance; capable of reaching exceeding level with extra push.',
    'Demonstrates positive attitude and consistent work ethic.',
  ],
  AE: [
    'Approaching expectations; encourage regular practice in core areas.',
    'Understands foundational ideas; needs to strengthen application.',
    'Capable of better performance with sustained focus and revision.',
    'Progressing well; target practice questions to boost confidence.',
  ],
  BE: [
    'Requires targeted intervention and remedial guidance.',
    'Needs extra support to master foundational competencies.',
  ],
};

const remarksByPoints = {
  8: 'Outstanding performance; demonstrates mastery across all learning competencies.',
  7: 'Very commendable work; displays strong analytical and problem-solving skills.',
  6: 'Good progress; demonstrates solid comprehension of curriculum topics.',
  5: 'Satisfactory effort; meets standard expectations with regular focus.',
  4: 'Approaching competency; needs targeted practice on key topics.',
  3: 'Shows potential; encourage dedicated daily revision.',
  2: 'Requires remedial support and close monitoring.',
  1: 'Needs urgent intervention and foundational reinforcement.',
};

async function seedMarksForClass(className: string) {
  // 1. Fetch active approved exam
  const [exam] = await db
    .select()
    .from(examinations)
    .where(and(eq(examinations.status, 'APPROVED'), isNull(examinations.deletedAt)));

  if (!exam) {
    throw new Error('No approved active examination found.');
  }

  // 2. Fetch class
  const [cls] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.name, className), isNull(classes.deletedAt)));

  if (!cls) {
    throw new Error(`Class "${className}" not found.`);
  }

  const isJunior = isJuniorSecondaryClass(cls);

  // 3. Fetch all active learners in class
  const classStudents = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, cls.id), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
    .orderBy(students.firstName, students.lastName);

  if (classStudents.length === 0) {
    throw new Error(`No active learners found in class ${className}.`);
  }

  // 4. Fetch class subjects
  const allSubjects = await db.select().from(subjects).where(isNull(subjects.deletedAt));
  const classSubjects = allSubjects.filter(
    (sub) =>
      sub.levelCategory === cls.levelCategory ||
      (cls.levelCategory === 'PRIMARY' &&
        (sub.levelCategory === 'LOWER_PRIMARY' || sub.levelCategory === 'UPPER_PRIMARY'))
  );

  // 5. Fetch teacher allocations for class
  const allocations = await db
    .select()
    .from(teacherSubjectAllocations)
    .where(and(eq(teacherSubjectAllocations.classId, cls.id), isNull(teacherSubjectAllocations.deletedAt)));

  const allocMap = new Map<string, string>();
  allocations.forEach((a) => allocMap.set(a.subjectId, a.teacherId));

  const fallbackTeacherId = cls.classTeacherId;

  console.log(`\n========================================`);
  console.log(`ASSIGNING MARKS FOR: ${cls.name}`);
  console.log(`Examination: ${exam.title} (${exam.id})`);
  console.log(`Learners: ${classStudents.length}`);
  console.log(`Subjects: ${classSubjects.length}`);
  console.log(`Grading System: ${isJunior ? 'CBC 8-Point Scale' : 'CBC 4-Level Rubrics'}`);
  console.log(`========================================\n`);

  const allScoresToInsert: any[] = [];
  const submissionsToUpsert: any[] = [];

  for (const sub of classSubjects) {
    const teacherId = allocMap.get(sub.id) || fallbackTeacherId;
    if (!teacherId) {
      console.warn(`No teacher allocated for ${sub.name}, skipping`);
      continue;
    }

    submissionsToUpsert.push({
      examId: exam.id,
      classId: cls.id,
      subjectId: sub.id,
      teacherId,
      status: 'LOCKED',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: cls.classTeacherId || teacherId,
    });

    for (let i = 0; i < classStudents.length; i++) {
      const st = classStudents[i];
      const rand = pseudoRandom(`${exam.id}_${cls.id}_${sub.id}_${st.id}`);
      let rawMark: number;
      if (rand > 0.85) {
        rawMark = Math.round(82 + (rand - 0.85) * 93.3);
      } else if (rand > 0.40) {
        rawMark = Math.round(60 + (rand - 0.40) * 46.6);
      } else if (rand > 0.10) {
        rawMark = Math.round(45 + (rand - 0.10) * 46.6);
      } else {
        rawMark = Math.round(32 + rand * 120);
      }
      rawMark = Math.max(30, Math.min(98, rawMark));

      let rubric: 'EE' | 'ME' | 'AE' | 'BE' | null = null;
      let points: number | null = null;
      let remark = '';

      if (isJunior) {
        points = calculateJuniorPoints(rawMark, 100);
        remark = remarksByPoints[points as keyof typeof remarksByPoints] || 'Good effort.';
      } else {
        rubric = calculateCbcRubric(rawMark, 100).code;
        const list = remarksByRubric[rubric];
        const rIndex = Math.floor(rand * list.length);
        remark = list[rIndex];
      }

      allScoresToInsert.push({
        examId: exam.id,
        studentId: st.id,
        subjectId: sub.id,
        marksObtained: rawMark.toFixed(2),
        maxMarks: 100,
        cbcRubricLevel: rubric,
        juniorPoints: points,
        teacherRemarks: remark,
        enteredById: teacherId,
      });
    }
  }

  // Fast batch upsert of scores
  console.log(`Executing batch upsert of ${allScoresToInsert.length} scores...`);
  const chunkSize = 100;
  for (let i = 0; i < allScoresToInsert.length; i += chunkSize) {
    const chunk = allScoresToInsert.slice(i, i + chunkSize);
    await db
      .insert(examScores)
      .values(chunk)
      .onConflictDoUpdate({
        target: [examScores.examId, examScores.studentId, examScores.subjectId],
        set: {
          marksObtained: sql`excluded.marks_obtained`,
          maxMarks: sql`excluded.max_marks`,
          cbcRubricLevel: sql`excluded.cbc_rubric_level`,
          juniorPoints: sql`excluded.junior_points`,
          teacherRemarks: sql`excluded.teacher_remarks`,
          enteredById: sql`excluded.entered_by_id`,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`✓ Scores batch upsert completed.`);

  // Upsert submissions
  for (const subItem of submissionsToUpsert) {
    const [existing] = await db
      .select()
      .from(markSubmissions)
      .where(
        and(
          eq(markSubmissions.examId, subItem.examId),
          eq(markSubmissions.classId, subItem.classId),
          eq(markSubmissions.subjectId, subItem.subjectId),
          isNull(markSubmissions.deletedAt)
        )
      );

    if (existing) {
      await db
        .update(markSubmissions)
        .set({
          status: 'LOCKED',
          teacherId: subItem.teacherId,
          submittedAt: subItem.submittedAt,
          reviewedAt: subItem.reviewedAt,
          reviewedById: subItem.reviewedById,
          updatedAt: new Date(),
        })
        .where(eq(markSubmissions.id, existing.id));
    } else {
      await db.insert(markSubmissions).values(subItem);
    }
  }

  console.log(`✓ All ${submissionsToUpsert.length} subject submissions set to LOCKED (Received by Deputy).`);
}

async function main() {
  console.log('Seeding marks for Grade 4 (Upper Primary) and Grade 7 (Junior Secondary)...');
  await seedMarksForClass('Grade 4');
  await seedMarksForClass('Grade 7');
  console.log('\n🎉 ALL MARKS SUCCESSFULLY SEEDED AND SUBMITTED TO DEPUTY HEAD!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed marks:', err);
  process.exit(1);
});
