import 'dotenv/config';
import argon2 from 'argon2';
import { db } from '../config/db.js';
import {
  users,
  roles,
  classes,
  subjects,
  userSubjects,
  teacherSubjectAllocations,
  systemSettings,
  eq,
  and,
  isNull,
} from '@school/shared';

async function seedTeachersAndAllocations() {
  console.log('--- Starting Teacher Population & Subject Allocation ---');

  // 1. Get current academic year
  const [settings] = await db.select().from(systemSettings).limit(1);
  const academicYear = settings?.currentAcademicYear || 2026;
  console.log(`Current Academic Year: ${academicYear}`);

  // 2. Fetch Roles
  const allRoles = await db.select().from(roles);
  const teacherRole = allRoles.find((r) => r.name === 'TEACHER');
  if (!teacherRole) throw new Error('TEACHER role not found');

  // 3. Password hash
  const defaultPassword = 'Password123!';
  const passwordHash = await argon2.hash(defaultPassword);

  // 4. Fetch All Subjects mapped by code
  const dbSubjects = await db.select().from(subjects).where(isNull(subjects.deletedAt));
  const subjectMap = new Map<string, (typeof dbSubjects)[0]>();
  for (const s of dbSubjects) {
    subjectMap.set(s.code, s);
  }

  // 5. Fetch All Classes mapped by name
  const dbClasses = await db.select().from(classes).where(isNull(classes.deletedAt));
  const classMap = new Map<string, (typeof dbClasses)[0]>();
  for (const c of dbClasses) {
    classMap.set(c.name, c);
  }

  // Define 20 Teachers (Kenyan names, TSC, Phone, Subject Specialization - AT MOST 2 SUBJECTS)
  const teacherDefinitions = [
    // --- 6 PPE & Lower Primary Class Teachers ---
    {
      firstName: 'Amina',
      lastName: 'Hassan',
      email: 'amina.hassan@school.co.ke',
      phoneNumber: '0711100201',
      nationalId: 'ID-28190001',
      tscNumber: 'TSC-450101',
      salaryAmount: '48000',
      classTeacherFor: 'Playgroup',
      specialtyCodes: ['PPE-LANG', 'PPE-MATH'], // at most 2 subjects
    },
    {
      firstName: 'Faith',
      lastName: 'Wanjiku',
      email: 'faith.wanjiku@school.co.ke',
      phoneNumber: '0711100202',
      nationalId: 'ID-28190002',
      tscNumber: 'TSC-450102',
      salaryAmount: '49000',
      classTeacherFor: 'PP1',
      specialtyCodes: ['PPE-ENV', 'PPE-CREAT'], // at most 2 subjects
    },
    {
      firstName: 'Halima',
      lastName: 'Noor',
      email: 'halima.noor@school.co.ke',
      phoneNumber: '0711100203',
      nationalId: 'ID-28190003',
      tscNumber: 'TSC-450103',
      salaryAmount: '50000',
      classTeacherFor: 'PP2',
      specialtyCodes: ['PPE-IRE', 'PPE-ARAB'], // at most 2 subjects
    },
    {
      firstName: 'Abdi',
      lastName: 'Kuku',
      email: 'yusuufabdisheikh@gmail.com', // existing teacher
      phoneNumber: '0711100204',
      nationalId: 'ID-28190004',
      tscNumber: 'TSC-450104',
      salaryAmount: '52000',
      classTeacherFor: 'Grade 1',
      specialtyCodes: ['LP-ENG', 'LP-MATH'], // at most 2 subjects
    },
    {
      firstName: 'Kevin',
      lastName: 'Kipchumba',
      email: 'kevin.kipchumba@school.co.ke',
      phoneNumber: '0711100205',
      nationalId: 'ID-28190005',
      tscNumber: 'TSC-450105',
      salaryAmount: '51000',
      classTeacherFor: 'Grade 2',
      specialtyCodes: ['LP-KISW', 'LP-ENV'], // at most 2 subjects
    },
    {
      firstName: 'Mary',
      lastName: 'Mwangi',
      email: 'mary.mwangi@school.co.ke',
      phoneNumber: '0711100206',
      nationalId: 'ID-28190006',
      tscNumber: 'TSC-450106',
      salaryAmount: '52000',
      classTeacherFor: 'Grade 3',
      specialtyCodes: ['LP-HYG', 'LP-CREAT'], // at most 2 subjects
    },

    // --- 14 Upper Primary & Junior Secondary Specialists (At most 2 subjects each) ---
    {
      firstName: 'Brian',
      lastName: 'Ochieng',
      email: 'brian.ochieng@school.co.ke',
      phoneNumber: '0711100207',
      nationalId: 'ID-28190007',
      tscNumber: 'TSC-450107',
      salaryAmount: '56000',
      classTeacherFor: 'Grade 4',
      specialtyCodes: ['UP-MATH', 'JSS-MATH'], // Mathematics specialist (2 subjects)
    },
    {
      firstName: 'Grace',
      lastName: 'Cherono',
      email: 'grace.cherono@school.co.ke',
      phoneNumber: '0711100208',
      nationalId: 'ID-28190008',
      tscNumber: 'TSC-450108',
      salaryAmount: '55000',
      classTeacherFor: 'Grade 5',
      specialtyCodes: ['UP-ENG', 'JSS-ENG'], // English specialist (2 subjects)
    },
    {
      firstName: 'Peter',
      lastName: 'Kimani',
      email: 'peter.kimani@school.co.ke',
      phoneNumber: '0711100209',
      nationalId: 'ID-28190009',
      tscNumber: 'TSC-450109',
      salaryAmount: '55000',
      classTeacherFor: 'Grade 6',
      specialtyCodes: ['UP-KISW', 'JSS-KISW'], // Kiswahili specialist (2 subjects)
    },
    {
      firstName: 'David',
      lastName: 'Mutua',
      email: 'david.mutua@school.co.ke',
      phoneNumber: '0711100210',
      nationalId: 'ID-28190010',
      tscNumber: 'TSC-450110',
      salaryAmount: '57000',
      classTeacherFor: 'Grade 7',
      specialtyCodes: ['UP-SCITECH', 'JSS-INTSCI'], // Science specialist (2 subjects)
    },
    {
      firstName: 'Samuel',
      lastName: 'Otieno',
      email: 'samuel.otieno@school.co.ke',
      phoneNumber: '0711100211',
      nationalId: 'ID-28190011',
      tscNumber: 'TSC-450111',
      salaryAmount: '54000',
      classTeacherFor: 'Grade 8',
      specialtyCodes: ['UP-SOC', 'JSS-SOC'], // Social Studies specialist (2 subjects)
    },
    {
      firstName: 'Emmanuel',
      lastName: 'Koech',
      email: 'emmanuel.koech@school.co.ke',
      phoneNumber: '0711100212',
      nationalId: 'ID-28190012',
      tscNumber: 'TSC-450112',
      salaryAmount: '56000',
      classTeacherFor: 'Grade 9',
      specialtyCodes: ['UP-AGRINUT', 'JSS-AGRINUT'], // Agriculture & Nutrition specialist (2 subjects)
    },
    {
      firstName: 'Beatrice',
      lastName: 'Atieno',
      email: 'beatrice.atieno@school.co.ke',
      phoneNumber: '0711100213',
      nationalId: 'ID-28190013',
      tscNumber: 'TSC-450113',
      salaryAmount: '53000',
      classTeacherFor: null,
      specialtyCodes: ['UP-PHE', 'JSS-HLTH'], // PHE & Health Education (2 subjects)
    },
    {
      firstName: 'Joshua',
      lastName: 'Kiprono',
      email: 'joshua.kiprono@school.co.ke',
      phoneNumber: '0711100214',
      nationalId: 'ID-28190014',
      tscNumber: 'TSC-450114',
      salaryAmount: '55000',
      classTeacherFor: null,
      specialtyCodes: ['UP-ARTS', 'JSS-ARTSPORT'], // Creative Arts & Sports (2 subjects)
    },
    {
      firstName: 'Victor',
      lastName: 'Mutiso',
      email: 'victor.mutiso@school.co.ke',
      phoneNumber: '0711100215',
      nationalId: 'ID-28190015',
      tscNumber: 'TSC-450115',
      salaryAmount: '58000',
      classTeacherFor: null,
      specialtyCodes: ['JSS-PRETECH', 'JSS-COMP'], // Technical Studies & Computing (2 subjects)
    },
    {
      firstName: 'Fatma',
      lastName: 'Said',
      email: 'fatma.said@school.co.ke',
      phoneNumber: '0711100216',
      nationalId: 'ID-28190016',
      tscNumber: 'TSC-450116',
      salaryAmount: '54000',
      classTeacherFor: null,
      specialtyCodes: ['UP-IRE', 'JSS-IRE'], // Islamic Religious Education (2 subjects)
    },
    {
      firstName: 'Rahma',
      lastName: 'Adan',
      email: 'rahma.adan@school.co.ke',
      phoneNumber: '0711100217',
      nationalId: 'ID-28190017',
      tscNumber: 'TSC-450117',
      salaryAmount: '54000',
      classTeacherFor: null,
      specialtyCodes: ['UP-ARAB', 'JSS-ARAB'], // Arabic Language (2 subjects)
    },
    {
      firstName: 'Bansar',
      lastName: 'Babidi',
      email: 'abdiansari9967@gmail.com', // existing teacher
      phoneNumber: '0711100218',
      nationalId: 'ID-28190018',
      tscNumber: 'TSC-450118',
      salaryAmount: '52000',
      classTeacherFor: null,
      specialtyCodes: ['UP-MATH', 'UP-SCITECH'], // Upper Primary Math & Science (2 subjects)
    },
    {
      firstName: 'Deno',
      lastName: 'Deno',
      email: 'deno79952@gmail.com', // existing teacher
      phoneNumber: '0711100219',
      nationalId: 'ID-28190019',
      tscNumber: 'TSC-450119',
      salaryAmount: '52000',
      classTeacherFor: null,
      specialtyCodes: ['UP-ENG', 'UP-KISW'], // Upper Primary Languages (2 subjects)
    },
    {
      firstName: 'Lucy',
      lastName: 'Wairimu',
      email: 'lucy.wairimu@school.co.ke',
      phoneNumber: '0711100220',
      nationalId: 'ID-28190020',
      tscNumber: 'TSC-450120',
      salaryAmount: '53000',
      classTeacherFor: null,
      specialtyCodes: ['JSS-MATH', 'JSS-COMP'], // JSS Mathematics & Computing (2 subjects)
    },
  ];

  console.log(`Configuring ${teacherDefinitions.length} teachers...`);

  const teacherUserMap = new Map<string, string>(); // email -> userId

  for (const tDef of teacherDefinitions) {
    const existing = await db.select().from(users).where(eq(users.email, tDef.email));
    let userId: string;

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(users)
        .values({
          firstName: tDef.firstName,
          lastName: tDef.lastName,
          email: tDef.email,
          phoneNumber: tDef.phoneNumber,
          nationalId: tDef.nationalId,
          tscNumber: tDef.tscNumber,
          roleId: teacherRole.id,
          salaryAmount: tDef.salaryAmount,
          salaryPaymentDay: 28,
          isActive: true,
          passwordHash,
          dateOfEmployment: new Date('2024-01-08'),
        })
        .returning();
      userId = inserted.id;
      console.log(`+ Created teacher: ${tDef.firstName} ${tDef.lastName} (${tDef.email})`);
    } else {
      userId = existing[0].id;
      await db
        .update(users)
        .set({
          firstName: tDef.firstName,
          lastName: tDef.lastName,
          phoneNumber: tDef.phoneNumber,
          tscNumber: tDef.tscNumber,
          roleId: teacherRole.id,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      console.log(`✓ Updated teacher: ${tDef.firstName} ${tDef.lastName} (${tDef.email})`);
    }

    teacherUserMap.set(tDef.email, userId);

    // Set user qualifications (userSubjects) - strictly <= 2 subjects!
    await db.delete(userSubjects).where(eq(userSubjects.userId, userId));
    for (const code of tDef.specialtyCodes) {
      const subj = subjectMap.get(code);
      if (subj) {
        await db.insert(userSubjects).values({
          userId,
          subjectId: subj.id,
        });
      }
    }
  }

  // 6. Assign Class Teachers to all 12 Classes
  console.log('\n--- Assigning Class Teachers to Classes ---');
  for (const tDef of teacherDefinitions) {
    if (tDef.classTeacherFor) {
      const targetClass = classMap.get(tDef.classTeacherFor);
      const teacherId = teacherUserMap.get(tDef.email);
      if (targetClass && teacherId) {
        await db
          .update(classes)
          .set({
            classTeacherId: teacherId,
            updatedAt: new Date(),
          })
          .where(eq(classes.id, targetClass.id));
        console.log(`Class Teacher: ${targetClass.name} -> ${tDef.firstName} ${tDef.lastName}`);
      }
    }
  }

  // 7. Populate Subject Allocations (teacherSubjectAllocations)
  // Strict rule: a teacher teaches AT MOST 2 SUBJECTS!
  console.log('\n--- Assigning Subject Allocations (Strictly <= 2 subjects per teacher) ---');

  // Clear existing allocations for this year to avoid orphaned/conflicting mappings
  await db
    .delete(teacherSubjectAllocations)
    .where(eq(teacherSubjectAllocations.academicYear, academicYear));

  // A. Auto-allocate PPE & Lower Primary classes to their respective class teachers
  const ppeLowerClasses = dbClasses.filter(
    (c) => c.levelCategory === 'PPE' || c.levelCategory === 'LOWER_PRIMARY'
  );

  for (const cls of ppeLowerClasses) {
    // Find class teacher
    const [freshClass] = await db.select().from(classes).where(eq(classes.id, cls.id));
    if (!freshClass?.classTeacherId) continue;

    const levelSubjects = dbSubjects.filter((s) => s.levelCategory === cls.levelCategory);
    for (const subj of levelSubjects) {
      await db.insert(teacherSubjectAllocations).values({
        classId: cls.id,
        subjectId: subj.id,
        teacherId: freshClass.classTeacherId,
        academicYear,
      });
    }
    console.log(`Auto-allocated ${levelSubjects.length} subjects for ${cls.name}`);
  }

  // B. Upper Primary & Junior Secondary Allocations
  // Teachers mapped to their specialized subjects:
  const specialistMap: Record<string, string> = {
    // Subject Code -> Teacher Email
    // Upper Primary (Grades 4-6)
    'UP-MATH': 'brian.ochieng@school.co.ke',
    'UP-ENG': 'grace.cherono@school.co.ke',
    'UP-KISW': 'peter.kimani@school.co.ke',
    'UP-SCITECH': 'david.mutua@school.co.ke',
    'UP-SOC': 'samuel.otieno@school.co.ke',
    'UP-AGRINUT': 'emmanuel.koech@school.co.ke',
    'UP-PHE': 'beatrice.atieno@school.co.ke',
    'UP-ARTS': 'joshua.kiprono@school.co.ke',
    'UP-IRE': 'fatma.said@school.co.ke',
    'UP-ARAB': 'rahma.adan@school.co.ke',

    // Junior Secondary (Grades 7-9)
    'JSS-MATH': 'brian.ochieng@school.co.ke',
    'JSS-ENG': 'grace.cherono@school.co.ke',
    'JSS-KISW': 'peter.kimani@school.co.ke',
    'JSS-INTSCI': 'david.mutua@school.co.ke',
    'JSS-SOC': 'samuel.otieno@school.co.ke',
    'JSS-AGRINUT': 'emmanuel.koech@school.co.ke',
    'JSS-HLTH': 'beatrice.atieno@school.co.ke',
    'JSS-ARTSPORT': 'joshua.kiprono@school.co.ke',
    'JSS-PRETECH': 'victor.mutiso@school.co.ke',
    'JSS-COMP': 'victor.mutiso@school.co.ke',
    'JSS-IRE': 'fatma.said@school.co.ke',
    'JSS-ARAB': 'rahma.adan@school.co.ke',
  };

  const upperClasses = ['Grade 4', 'Grade 5', 'Grade 6'];
  const jssClasses = ['Grade 7', 'Grade 8', 'Grade 9'];

  // Upper Primary Allocations
  for (const cName of upperClasses) {
    const cls = classMap.get(cName);
    if (!cls) continue;
    const upSubjects = dbSubjects.filter((s) => s.levelCategory === 'UPPER_PRIMARY');
    for (const subj of upSubjects) {
      const teacherEmail = specialistMap[subj.code];
      const teacherId = teacherEmail ? teacherUserMap.get(teacherEmail) : null;
      if (teacherId) {
        await db.insert(teacherSubjectAllocations).values({
          classId: cls.id,
          subjectId: subj.id,
          teacherId,
          academicYear,
        });
      }
    }
  }
  console.log(`Allocated Upper Primary subjects across Grade 4, 5, 6`);

  // Junior Secondary Allocations
  for (const cName of jssClasses) {
    const cls = classMap.get(cName);
    if (!cls) continue;
    const jssSubjects = dbSubjects.filter((s) => s.levelCategory === 'JUNIOR');
    for (const subj of jssSubjects) {
      const teacherEmail = specialistMap[subj.code];
      const teacherId = teacherEmail ? teacherUserMap.get(teacherEmail) : null;
      if (teacherId) {
        await db.insert(teacherSubjectAllocations).values({
          classId: cls.id,
          subjectId: subj.id,
          teacherId,
          academicYear,
        });
      }
    }
  }
  console.log(`Allocated Junior Secondary subjects across Grade 7, 8, 9`);

  // Verify that every teacher teaches AT MOST 2 distinct subjects in Upper Primary & JSS!
  console.log('\n--- Verifying Teacher Subject Counts (Max 2 rule) ---');
  const allCurrentAllocations = await db
    .select({
      teacherId: teacherSubjectAllocations.teacherId,
      subjectId: teacherSubjectAllocations.subjectId,
    })
    .from(teacherSubjectAllocations)
    .where(
      and(
        eq(teacherSubjectAllocations.academicYear, academicYear),
        isNull(teacherSubjectAllocations.deletedAt)
      )
    );

  const teacherDistinctSubjects = new Map<string, Set<string>>();
  for (const alloc of allCurrentAllocations) {
    if (!teacherDistinctSubjects.has(alloc.teacherId)) {
      teacherDistinctSubjects.set(alloc.teacherId, new Set());
    }
    teacherDistinctSubjects.get(alloc.teacherId)!.add(alloc.subjectId);
  }

  // Check Upper Primary / JSS teachers (who specialize in subjects)
  for (const tDef of teacherDefinitions) {
    const tId = teacherUserMap.get(tDef.email);
    if (!tId) continue;
    // For specialists in Upper & JSS
    const count = teacherDistinctSubjects.get(tId)?.size || 0;
    console.log(`Teacher ${tDef.firstName} ${tDef.lastName}: ${count} distinct subjects`);
  }

  console.log('\n=== Teacher Population and Allocations Seed Complete ===');
  process.exit(0);
}

seedTeachersAndAllocations().catch((err) => {
  console.error('Error seeding teachers:', err);
  process.exit(1);
});
