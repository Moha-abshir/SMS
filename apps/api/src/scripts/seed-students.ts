import postgres from 'postgres';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const FIRST_NAMES_MALE = [
  'Ahmed', 'Mohamed', 'Ibrahim', 'Youssef', 'Tariq', 'Omar', 'Ali', 'Hassan', 'Hussein', 'Abdirahman',
  'Kevin', 'Brian', 'Dennis', 'Emmanuel', 'Samuel', 'David', 'Peter', 'John', 'Joseph', 'Victor',
  'Kiprono', 'Kipchumba', 'Kibet', 'Kiprotich', 'Cheruiyot', 'Otieno', 'Ochieng', 'Oduor', 'Onyango', 'Wanjiku'
];

const FIRST_NAMES_FEMALE = [
  'Fatuma', 'Amina', 'Zahra', 'Halima', 'Maryam', 'Asha', 'Habiba', 'Safia', 'Khadija', 'Rukia',
  'Faith', 'Grace', 'Mercy', 'Joy', 'Beatrice', 'Agnes', 'Jane', 'Mary', 'Lucy', 'Esther',
  'Chebet', 'Jepchirchir', 'Jepkorir', 'Jepkemboi', 'Wanjiru', 'Muthoni', 'Akinyi', 'Atieno', 'Adhiambo', 'Nekesa'
];

const LAST_NAMES = [
  'Abdi', 'Hassan', 'Ali', 'Mohamed', 'Ibrahim', 'Oumar', 'Mwangi', 'Kamau', 'Njoroge', 'Maina',
  'Kiprop', 'Kipkorir', 'Koech', 'Cheruiyot', 'Bett', 'Otieno', 'Ochieng', 'Onyango', 'Oduor', 'Mutua',
  'Kimani', 'Wambugu', 'Karanja', 'Gicheru', 'Chepkwony', 'Rotich', 'Keter', 'Omondi', 'Wasike', 'Wafula'
];

const ESTATES = [
  'Eldoret West', 'Huruma Estate', 'Pioneer Estate', 'Langas Estate', 'Elgon View',
  'Annex Estate', 'Kapsoya Estate', 'Maili Nne', 'Kiembeni', 'Racecourse', 'Action Estate'
];

async function seedStudentsAndGuardians() {
  console.log('🌱 Starting Student & Parent Test Data Seeding...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined in apps/api/.env!');
  }

  const sql = postgres(dbUrl);

  try {
    // 1. Seed System Settings if missing
    const existingSettings = await sql`SELECT id FROM system_settings LIMIT 1;`;
    if (existingSettings.length === 0) {
      await sql`
        INSERT INTO system_settings (
          id, school_name, school_motto, address, po_box, county,
          contact_phone, contact_email, current_academic_year, updated_at
        ) VALUES (
          ${randomUUID()}, 'Eldoret Muslim Academy', 'Excellence in Knowledge & Character',
          'Pioneer Road, Eldoret', 'P.O. Box 1234 - 30100', 'Uasin Gishu',
          '+254700000000', 'info@eldoretmuslim.ac.ke',
          2026, NOW()
        );
      `;
      console.log('🏫 Seeded school system settings.');
    }

    // 2. Seed Academic Terms if missing
    let term1Id = '';
    const existingTerms = await sql`SELECT id, term_number, is_current FROM academic_terms;`;
    if (existingTerms.length === 0) {
      term1Id = randomUUID();
      const term2Id = randomUUID();
      const term3Id = randomUUID();
      await sql`
        INSERT INTO academic_terms (id, year, term_number, start_date, end_date, is_current)
        VALUES
          (${term1Id}, 2026, 1, '2026-01-08', '2026-04-05', true),
          (${term2Id}, 2026, 2, '2026-05-04', '2026-08-07', false),
          (${term3Id}, 2026, 3, '2026-09-01', '2026-11-20', false);
      `;
      console.log('📅 Seeded 3 Academic Terms for 2026.');
    }

    // 3. Seed Classes (Playgroup to Grade 9) if missing
    let dbClasses = await sql`SELECT id, name, level_category, numeric_order FROM classes ORDER BY numeric_order ASC;`;
    if (dbClasses.length === 0) {
      const defaultClasses = [
        { id: randomUUID(), name: 'Playgroup', level_category: 'PPE', numeric_order: 1 },
        { id: randomUUID(), name: 'PP1', level_category: 'PPE', numeric_order: 2 },
        { id: randomUUID(), name: 'PP2', level_category: 'PPE', numeric_order: 3 },
        { id: randomUUID(), name: 'Grade 1', level_category: 'LOWER_PRIMARY', numeric_order: 4 },
        { id: randomUUID(), name: 'Grade 2', level_category: 'LOWER_PRIMARY', numeric_order: 5 },
        { id: randomUUID(), name: 'Grade 3', level_category: 'LOWER_PRIMARY', numeric_order: 6 },
        { id: randomUUID(), name: 'Grade 4', level_category: 'UPPER_PRIMARY', numeric_order: 7 },
        { id: randomUUID(), name: 'Grade 5', level_category: 'UPPER_PRIMARY', numeric_order: 8 },
        { id: randomUUID(), name: 'Grade 6', level_category: 'UPPER_PRIMARY', numeric_order: 9 },
        { id: randomUUID(), name: 'Grade 7', level_category: 'JUNIOR', numeric_order: 10 },
        { id: randomUUID(), name: 'Grade 8', level_category: 'JUNIOR', numeric_order: 11 },
        { id: randomUUID(), name: 'Grade 9', level_category: 'JUNIOR', numeric_order: 12 },
      ];
      await sql`INSERT INTO classes ${sql(defaultClasses, 'id', 'name', 'level_category', 'numeric_order')};`;
      console.log(`📚 Seeded ${defaultClasses.length} school classes (Playgroup to Grade 9).`);
      dbClasses = await sql`SELECT id, name, level_category, numeric_order FROM classes ORDER BY numeric_order ASC;`;
    }
    console.log(`Found ${dbClasses.length} classes in DB.`);

    console.log('🧹 Cleaning existing test students and guardians...');
    await sql`DELETE FROM student_bills;`;
    await sql`DELETE FROM attendance_records;`;
    await sql`DELETE FROM exam_scores;`;
    await sql`DELETE FROM cat_scores;`;
    await sql`DELETE FROM students;`;
    await sql`DELETE FROM guardians;`;

    const totalGuardiansNeeded = 120 + 90 + 20; // 230
    console.log(`👨‍👩‍👧 Creating ${totalGuardiansNeeded} realistic parent profiles...`);

    const guardiansList: Array<{
      id: string;
      full_name: string;
      phone_number: string;
      id_number: string;
      address: string;
      relationship: string;
    }> = [];

    const usedPhoneNumbers = new Set<string>();
    const usedIdNumbers = new Set<string>();

    for (let i = 0; i < totalGuardiansNeeded; i++) {
      const isMale = Math.random() > 0.4;
      const firstName = isMale
        ? FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)]
        : FIRST_NAMES_FEMALE[Math.floor(Math.random() * FIRST_NAMES_FEMALE.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const fullName = `${firstName} ${lastName}`;

      let phoneNumber = '';
      do {
        const rand7 = Math.floor(1000000 + Math.random() * 9000000);
        phoneNumber = `+2547${rand7}`;
      } while (usedPhoneNumbers.has(phoneNumber));
      usedPhoneNumbers.add(phoneNumber);

      let idNumber = '';
      do {
        idNumber = Math.floor(20000000 + Math.random() * 19000000).toString();
      } while (usedIdNumbers.has(idNumber));
      usedIdNumbers.add(idNumber);

      const address = `${ESTATES[Math.floor(Math.random() * ESTATES.length)]}, Eldoret`;
      const relationship = isMale ? 'Father' : 'Mother';

      guardiansList.push({
        id: randomUUID(),
        full_name: fullName,
        phone_number: phoneNumber,
        id_number: idNumber,
        address,
        relationship,
      });
    }

    // Single batch insert for all guardians
    await sql`INSERT INTO guardians ${sql(guardiansList, 'id', 'full_name', 'phone_number', 'id_number', 'address', 'relationship')};`;
    console.log(`✅ Successfully inserted ${guardiansList.length} parent records into database.`);

    const guardianAssignPool: string[] = [];
    for (let i = 0; i < 120; i++) {
      guardianAssignPool.push(guardiansList[i].id);
    }
    for (let i = 120; i < 210; i++) {
      guardianAssignPool.push(guardiansList[i].id);
      guardianAssignPool.push(guardiansList[i].id);
    }
    for (let i = 210; i < 230; i++) {
      guardianAssignPool.push(guardiansList[i].id);
      guardianAssignPool.push(guardiansList[i].id);
      guardianAssignPool.push(guardiansList[i].id);
    }

    for (let i = guardianAssignPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [guardianAssignPool[i], guardianAssignPool[j]] = [guardianAssignPool[j], guardianAssignPool[i]];
    }

    console.log('🎒 Generating 30 students per class across all 12 grades...');
    const studentsList: Array<{
      id: string;
      assessment_number: string;
      first_name: string;
      middle_name: string;
      last_name: string;
      gender: string;
      class_id: string;
      primary_guardian_id: string;
      admission_date: string;
      status: string;
    }> = [];

    let guardianPoolIndex = 0;
    const todayDate = '2026-01-08';

    for (let cIdx = 0; cIdx < dbClasses.length; cIdx++) {
      const cls = dbClasses[cIdx];

      for (let sIdx = 1; sIdx <= 30; sIdx++) {
        const studentId = randomUUID();
        const cCode = String(cIdx + 1).padStart(2, '0');
        const sCode = String(sIdx).padStart(2, '0');
        const rCode = String(Math.floor(100 + Math.random() * 900));
        const assessmentNumber = `2690${cCode}${sCode}${rCode}`;

        const isMale = Math.random() > 0.5;
        const gender = isMale ? 'MALE' : 'FEMALE';

        const firstName = isMale
          ? FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)]
          : FIRST_NAMES_FEMALE[Math.floor(Math.random() * FIRST_NAMES_FEMALE.length)];
        const middleName = FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)];

        const guardianId = guardianAssignPool[guardianPoolIndex % guardianAssignPool.length];
        guardianPoolIndex++;

        const guardianObj = guardiansList.find((g) => g.id === guardianId);
        const lastName = guardianObj ? guardianObj.full_name.split(' ').pop() || 'Mohamed' : 'Hassan';

        studentsList.push({
          id: studentId,
          assessment_number: assessmentNumber,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          gender,
          class_id: cls.id,
          primary_guardian_id: guardianId,
          admission_date: todayDate,
          status: 'ACTIVE',
        });
      }
    }

    // Single batch insert for all 360 students
    await sql`INSERT INTO students ${sql(studentsList, 'id', 'assessment_number', 'first_name', 'middle_name', 'last_name', 'gender', 'class_id', 'primary_guardian_id', 'admission_date', 'status')};`;

    console.log(`🎉 SUCCESS: Created ${studentsList.length} active learners across ${dbClasses.length} classes!`);
    console.log(`✨ Parent-student multi-child linkages generated cleanly.`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await sql.end();
  }
}

seedStudentsAndGuardians();
