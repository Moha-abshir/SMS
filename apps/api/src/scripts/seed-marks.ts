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

async function seedMarksForAllClasses() {
  console.log('========================================================');
  console.log('  SCHOOL-WIDE EXAMINATION MARKS POPULATION & SUBMISSION');
  console.log('========================================================\n');

  // 1. Fetch active approved exam
  const [exam] = await db
    .select()
    .from(examinations)
    .where(and(eq(examinations.status, 'APPROVED'), isNull(examinations.deletedAt)));

  if (!exam) {
    throw new Error('No approved active examination found in database.');
  }

  console.log(`Active Examination: "${exam.title}" (ID: ${exam.id})\n`);

  // 2. Fetch all classes ordered by numericOrder
  const allClasses = await db
    .select()
    .from(classes)
    .where(isNull(classes.deletedAt))
    .orderBy(classes.numericOrder);

  // 3. Fetch all subjects
  const allSubjects = await db.select().from(subjects).where(isNull(subjects.deletedAt));

  // 4. Fetch all allocations
  const allAllocations = await db
    .select()
    .from(teacherSubjectAllocations)
    .where(isNull(teacherSubjectAllocations.deletedAt));

  const allocMap = new Map<string, string>();
  allAllocations.forEach((a) => allocMap.set(`${a.classId}_${a.subjectId}`, a.teacherId));

  const allScoresToInsert: any[] = [];
  const submissionsToUpsert: any[] = [];

  let grandTotalStudents = 0;
  let grandTotalPapers = 0;

  for (const cls of allClasses) {
    const isJunior = isJuniorSecondaryClass(cls);

    // Active students in class
    const classStudents = await db
      .select()
      .from(students)
      .where(and(eq(students.classId, cls.id), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .orderBy(students.firstName, students.lastName);

    if (classStudents.length === 0) {
      console.warn(`Class ${cls.name} has 0 active students, skipping`);
      continue;
    }

    grandTotalStudents += classStudents.length;

    // Subjects matching this levelCategory
    const classSubjects = allSubjects.filter(
      (sub) =>
        sub.levelCategory === cls.levelCategory ||
        (cls.levelCategory === 'PRIMARY' &&
          (sub.levelCategory === 'LOWER_PRIMARY' || sub.levelCategory === 'UPPER_PRIMARY'))
    );

    grandTotalPapers += classSubjects.length;

    console.log(`Processing ${cls.name.padEnd(12)} | Category: ${cls.levelCategory.padEnd(14)} | Students: ${classStudents.length} | Subjects: ${classSubjects.length}`);

    for (const sub of classSubjects) {
      // Find allocated teacher or fallback to class teacher
      const teacherId = allocMap.get(`${cls.id}_${sub.id}`) || cls.classTeacherId;
      if (!teacherId) {
        console.warn(`  Warning: No teacher found for ${cls.name} - ${sub.name}`);
        continue;
      }

      // Prepare submission locked and reviewed by Class Teacher
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

      // Prepare scores for all learners
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
  }

  console.log(`\n--------------------------------------------------------`);
  console.log(`Prepared ${allScoresToInsert.length} total student scores.`);
  console.log(`Prepared ${submissionsToUpsert.length} class subject submissions to lock.`);
  console.log(`--------------------------------------------------------\n`);

  // Batch insert examScores in chunks of 250
  console.log(`Executing batch upsert for ${allScoresToInsert.length} exam scores...`);
  const chunkSize = 250;
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
    process.stdout.write(`  Upserted chunk ${Math.min(i + chunkSize, allScoresToInsert.length)} / ${allScoresToInsert.length} scores\r`);
  }
  console.log(`\n✓ All ${allScoresToInsert.length} exam scores successfully upserted.`);

  // Batch upsert mark_submissions in chunks of 50
  console.log(`\nLocking & submitting ${submissionsToUpsert.length} subject papers to Deputy Head...`);
  const subChunkSize = 50;
  for (let i = 0; i < submissionsToUpsert.length; i += subChunkSize) {
    const chunk = submissionsToUpsert.slice(i, i + subChunkSize);
    await db
      .insert(markSubmissions)
      .values(chunk)
      .onConflictDoUpdate({
        target: [markSubmissions.examId, markSubmissions.classId, markSubmissions.subjectId],
        set: {
          status: sql`excluded.status`,
          teacherId: sql`excluded.teacher_id`,
          submittedAt: sql`excluded.submitted_at`,
          reviewedAt: sql`excluded.reviewed_at`,
          reviewedById: sql`excluded.reviewed_by_id`,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`✓ All ${submissionsToUpsert.length} subject submissions permanently locked and received by Deputy Head.`);

  console.log(`\n========================================================`);
  console.log(`🎉 WHOLE SCHOOL POPULATION COMPLETE!`);
  console.log(`- Classes Processed: ${allClasses.length}`);
  console.log(`- Total Students Scored: ${grandTotalStudents}`);
  console.log(`- Total Scores Upserted: ${allScoresToInsert.length}`);
  console.log(`- Total Submissions Locked: ${submissionsToUpsert.length}`);
  console.log(`========================================================\n`);
}

seedMarksForAllClasses()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed whole-school marks:', err);
    process.exit(1);
  });
