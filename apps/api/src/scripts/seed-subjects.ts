import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

export const STANDARD_CBC_SUBJECTS = [
  // 1. ECDE / Pre-Primary (Playgroup, PP1, PP2) - Level: 'PPE'
  { name: 'Language Activities', code: 'PPE-LANG', levelCategory: 'PPE' },
  { name: 'Mathematical Activities', code: 'PPE-MATH', levelCategory: 'PPE' },
  { name: 'Environmental Activities', code: 'PPE-ENV', levelCategory: 'PPE' },
  { name: 'Psychomotor & Creative Activities', code: 'PPE-CREAT', levelCategory: 'PPE' },
  { name: 'Islamic Religious Activities', code: 'PPE-IRE', levelCategory: 'PPE' },
  { name: 'Arabic Language Activities', code: 'PPE-ARAB', levelCategory: 'PPE' },

  // 2. Lower Primary (Grades 1 – 3) - Level: 'LOWER_PRIMARY'
  { name: 'English Language Activities', code: 'LP-ENG', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Kiswahili Language Activities', code: 'LP-KISW', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Mathematical Activities', code: 'LP-MATH', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Environmental Activities', code: 'LP-ENV', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Hygiene & Nutrition Activities', code: 'LP-HYG', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Movement & Creative Activities', code: 'LP-CREAT', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Islamic Religious Education (IRE)', code: 'LP-IRE', levelCategory: 'LOWER_PRIMARY' },
  { name: 'Arabic Language', code: 'LP-ARAB', levelCategory: 'LOWER_PRIMARY' },

  // 3. Upper Primary (Grades 4 – 6) - Level: 'UPPER_PRIMARY'
  { name: 'English', code: 'UP-ENG', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Kiswahili', code: 'UP-KISW', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Mathematics', code: 'UP-MATH', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Science & Technology', code: 'UP-SCITECH', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Agriculture & Nutrition', code: 'UP-AGRINUT', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Social Studies', code: 'UP-SOC', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Islamic Religious Education (IRE)', code: 'UP-IRE', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Creative Arts', code: 'UP-ARTS', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Physical & Health Education (PHE)', code: 'UP-PHE', levelCategory: 'UPPER_PRIMARY' },
  { name: 'Arabic Language', code: 'UP-ARAB', levelCategory: 'UPPER_PRIMARY' },

  // 4. Junior Secondary School (Grades 7 – 9) - Level: 'JUNIOR'
  { name: 'English', code: 'JSS-ENG', levelCategory: 'JUNIOR' },
  { name: 'Kiswahili', code: 'JSS-KISW', levelCategory: 'JUNIOR' },
  { name: 'Mathematics', code: 'JSS-MATH', levelCategory: 'JUNIOR' },
  { name: 'Integrated Science', code: 'JSS-INTSCI', levelCategory: 'JUNIOR' },
  { name: 'Health Education', code: 'JSS-HLTH', levelCategory: 'JUNIOR' },
  { name: 'Social Studies', code: 'JSS-SOC', levelCategory: 'JUNIOR' },
  { name: 'Islamic Religious Education (IRE)', code: 'JSS-IRE', levelCategory: 'JUNIOR' },
  { name: 'Agriculture & Nutrition', code: 'JSS-AGRINUT', levelCategory: 'JUNIOR' },
  { name: 'Pre-Technical Studies', code: 'JSS-PRETECH', levelCategory: 'JUNIOR' },
  { name: 'Creative Arts & Sports', code: 'JSS-ARTSPORT', levelCategory: 'JUNIOR' },
  { name: 'Computer Studies', code: 'JSS-COMP', levelCategory: 'JUNIOR' },
  { name: 'Arabic Language', code: 'JSS-ARAB', levelCategory: 'JUNIOR' },
];

export async function seedSubjects() {
  console.log('🌱 Starting CBC Subjects & Learning Areas Seeding...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined in apps/api/.env!');
  }

  const sql = postgres(dbUrl);

  try {
    let insertedCount = 0;
    let existingCount = 0;

    for (const sub of STANDARD_CBC_SUBJECTS) {
      const [existing] = await sql`
        SELECT id, name, code, level_category, deleted_at 
        FROM subjects 
        WHERE code = ${sub.code}
      `;

      if (existing) {
        if (existing.deleted_at) {
          await sql`
            UPDATE subjects 
            SET deleted_at = NULL, name = ${sub.name}, level_category = ${sub.levelCategory}, updated_at = NOW()
            WHERE id = ${existing.id}
          `;
          insertedCount++;
          console.log(`♻️ Restored subject: [${sub.code}] ${sub.name} (${sub.levelCategory})`);
        } else {
          existingCount++;
          console.log(`✓ Subject already exists: [${sub.code}] ${sub.name} (${sub.levelCategory})`);
        }
      } else {
        await sql`
          INSERT INTO subjects (id, name, code, level_category, created_at, updated_at)
          VALUES (${randomUUID()}, ${sub.name}, ${sub.code}, ${sub.levelCategory}, NOW(), NOW())
        `;
        insertedCount++;
        console.log(`+ Inserted subject: [${sub.code}] ${sub.name} (${sub.levelCategory})`);
      }
    }

    console.log(`\n🎉 Subjects Seeding Summary: ${insertedCount} inserted/restored, ${existingCount} already present.`);

    // Auto-allocate learning areas for assigned Class Teachers in PPE & LOWER_PRIMARY (Grades 1-3)
    const currentYear = 2026;
    const assignedClasses = await sql`
      SELECT c.id, c.name, c.level_category, c.class_teacher_id
      FROM classes c
      WHERE c.class_teacher_id IS NOT NULL 
        AND c.level_category IN ('PPE', 'LOWER_PRIMARY')
    `;

    console.log(`\n📋 Found ${assignedClasses.length} PPE/Lower Primary classes with assigned Class Teachers for auto-allocation:`);
    for (const cls of assignedClasses) {
      const levelSubjects = await sql`
        SELECT id, name, code FROM subjects
        WHERE level_category = ${cls.level_category} AND deleted_at IS NULL
      `;

      let allocCount = 0;
      for (const subj of levelSubjects) {
        const [existingAlloc] = await sql`
          SELECT id FROM teacher_subject_allocations
          WHERE class_id = ${cls.id} 
            AND subject_id = ${subj.id} 
            AND academic_year = ${currentYear}
            AND deleted_at IS NULL
        `;

        if (!existingAlloc) {
          await sql`
            INSERT INTO teacher_subject_allocations (id, academic_year, class_id, subject_id, teacher_id, created_at, updated_at)
            VALUES (${randomUUID()}, ${currentYear}, ${cls.id}, ${subj.id}, ${cls.class_teacher_id}, NOW(), NOW())
          `;
          allocCount++;
        }
      }
      console.log(`  - Class "${cls.name}": auto-allocated ${allocCount} learning areas to Class Teacher.`);
    }

    console.log('\n✅ Subject and class level configuration successfully completed!');
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedSubjects()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error seeding subjects:', err);
      process.exit(1);
    });
}
