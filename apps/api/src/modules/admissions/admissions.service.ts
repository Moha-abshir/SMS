import { db } from '../../config/db.js';
import { students, guardians, classes, eq, isNull, desc, ilike, or } from '@school/shared';

export class AdmissionsService {
  static async searchGuardians(query: string) {
    if (!query || query.trim().length < 2) return [];
    const searchPattern = `%${query.trim()}%`;
    return await db
      .select()
      .from(guardians)
      .where(
        or(
          ilike(guardians.phoneNumber, searchPattern),
          ilike(guardians.idNumber, searchPattern),
          ilike(guardians.fullName, searchPattern)
        )
      )
      .limit(10);
  }

  static async getClasses() {
    return await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);
  }

  static async seedClassesIfEmpty() {
    const existing = await db.select().from(classes);
    if (existing.length === 0) {
      const defaultClasses = [
        { name: 'Playgroup', levelCategory: 'PPE' as const, numericOrder: 1 },
        { name: 'PP1', levelCategory: 'PPE' as const, numericOrder: 2 },
        { name: 'PP2', levelCategory: 'PPE' as const, numericOrder: 3 },
        { name: 'Grade 1', levelCategory: 'LOWER_PRIMARY' as const, numericOrder: 4 },
        { name: 'Grade 2', levelCategory: 'LOWER_PRIMARY' as const, numericOrder: 5 },
        { name: 'Grade 3', levelCategory: 'LOWER_PRIMARY' as const, numericOrder: 6 },
        { name: 'Grade 4', levelCategory: 'UPPER_PRIMARY' as const, numericOrder: 7 },
        { name: 'Grade 5', levelCategory: 'UPPER_PRIMARY' as const, numericOrder: 8 },
        { name: 'Grade 6', levelCategory: 'UPPER_PRIMARY' as const, numericOrder: 9 },
        { name: 'Grade 7', levelCategory: 'JUNIOR' as const, numericOrder: 10 },
        { name: 'Grade 8', levelCategory: 'JUNIOR' as const, numericOrder: 11 },
        { name: 'Grade 9', levelCategory: 'JUNIOR' as const, numericOrder: 12 },
      ];
      await db.insert(classes).values(defaultClasses);
    }
    return await this.getClasses();
  }

  static async admitStudent(
    studentData: {
      assessmentNumber: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      gender: 'MALE' | 'FEMALE';
      previousGrade?: string;
      classId: string;
      admissionDate: string;
    },
    guardianData: {
      existingGuardianId?: string;
      fullName?: string;
      phoneNumber?: string;
      idNumber?: string;
      address?: string;
      emergencyContact?: string;
      relationship?: string;
    },
    admittedById: string,
    isDirectActive = true
  ) {
    let targetGuardianId = guardianData.existingGuardianId;

    if (!targetGuardianId) {
      // Create new guardian if not linked to an existing one
      if (!guardianData.fullName || !guardianData.phoneNumber || !guardianData.idNumber) {
        throw new Error('Guardian full name, phone number, and ID number are required');
      }

      // Check if guardian with this ID number already exists
      const [existingGuardian] = await db
        .select()
        .from(guardians)
        .where(eq(guardians.idNumber, guardianData.idNumber.trim()));

      if (existingGuardian) {
        targetGuardianId = existingGuardian.id;
      } else {
        const [newGuardian] = await db
          .insert(guardians)
          .values({
            fullName: guardianData.fullName.trim(),
            phoneNumber: guardianData.phoneNumber.trim(),
            idNumber: guardianData.idNumber.trim(),
            address: guardianData.address?.trim(),
            emergencyContact: guardianData.emergencyContact?.trim(),
            relationship: guardianData.relationship?.trim() || 'Parent/Guardian',
            createdBy: admittedById,
          })
          .returning();
        targetGuardianId = newGuardian.id;
      }
    }

    // Insert student record with KNEC Assessment Number
    const [newStudent] = await db
      .insert(students)
      .values({
        assessmentNumber: studentData.assessmentNumber.trim(),
        firstName: studentData.firstName.trim(),
        middleName: studentData.middleName?.trim(),
        lastName: studentData.lastName.trim(),
        gender: studentData.gender,
        previousGrade: studentData.previousGrade?.trim(),
        classId: studentData.classId,
        primaryGuardianId: targetGuardianId!,
        admissionDate: studentData.admissionDate || new Date().toISOString().split('T')[0],
        approvedById: isDirectActive ? admittedById : null,
        status: isDirectActive ? 'ACTIVE' : 'PENDING',
        createdBy: admittedById,
      })
      .returning();

    return newStudent;
  }

  static getImportTemplateCsv(): string {
    const headers = [
      'assessmentNumber',
      'firstName',
      'middleName',
      'lastName',
      'gender',
      'className',
      'admissionDate',
      'previousGrade',
      'guardianFullName',
      'guardianPhoneNumber',
      'guardianIdNumber',
      'guardianRelationship',
      'guardianAddress',
      'emergencyContact',
    ];
    const sampleRow1 = [
      'KNEC-2026-001',
      'John',
      'Kip',
      'Kemboi',
      'MALE',
      'Grade 1',
      '2026-01-10',
      'PP2',
      'Mary Kemboi',
      '0712345678',
      '28475920',
      'Mother',
      'Eldoret West',
      '0723456789',
    ];
    const sampleRow2 = [
      'KNEC-2026-002',
      'Amina',
      '',
      'Hassan',
      'FEMALE',
      'Grade 7',
      '2026-01-10',
      'Grade 6',
      'Ali Hassan',
      '0722334455',
      '19384729',
      'Father',
      'Eldoret Central',
      '0733445566',
    ];
    return [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');
  }

  static async bulkImportStudents(
    input: any,
    admittedById: string,
    isDirectActive = true
  ) {
    let rows: any[] = [];
    if (typeof input === 'string') {
      const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('CSV file must contain a header row and at least one data row');
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || '';
        });
        rows.push(obj);
      }
    } else if (Array.isArray(input)) {
      rows = input;
    } else if (input && Array.isArray(input.rows)) {
      rows = input.rows;
    } else {
      throw new Error('Invalid payload: expected rows array or CSV text string');
    }

    if (rows.length === 0) {
      throw new Error('No student records found in payload');
    }

    const existingClasses = await db.select().from(classes).where(isNull(classes.deletedAt));
    const classMap = new Map<string, string>();
    existingClasses.forEach((c) => {
      classMap.set(c.name.trim().toLowerCase(), c.id);
      classMap.set(c.id, c.id);
    });

    const existingStudents = await db.select({ assessmentNumber: students.assessmentNumber }).from(students);
    const existingAssessments = new Set(existingStudents.map((s) => s.assessmentNumber.trim().toLowerCase()));

    const seenInFile = new Set<string>();
    const errors: string[] = [];
    const validRows: any[] = [];

    rows.forEach((r, idx) => {
      const lineNum = idx + 1;
      const assessmentNo = (r.assessmentNumber || r.assessment_number || '').toString().trim();
      const firstName = (r.firstName || r.first_name || '').toString().trim();
      const lastName = (r.lastName || r.last_name || '').toString().trim();
      const middleName = (r.middleName || r.middle_name || '').toString().trim();
      const genderRaw = (r.gender || 'MALE').toString().trim().toUpperCase();
      const gender = (genderRaw === 'FEMALE' ? 'FEMALE' : 'MALE') as 'MALE' | 'FEMALE';
      const classNameRaw = (r.className || r.class_name || r.classId || r.class_id || '').toString().trim();
      const classId = classMap.get(classNameRaw.toLowerCase());
      const admissionDate = (r.admissionDate || r.admission_date || new Date().toISOString().split('T')[0]).toString().trim();
      const previousGrade = (r.previousGrade || r.previous_grade || '').toString().trim();

      const guardianFullName = (r.guardianFullName || r.guardian_full_name || r.guardianName || '').toString().trim();
      const guardianPhoneNumber = (r.guardianPhoneNumber || r.guardian_phone_number || r.guardianPhone || '').toString().trim();
      const guardianIdNumber = (r.guardianIdNumber || r.guardian_id_number || r.guardianId || '').toString().trim();
      const guardianRelationship = (r.guardianRelationship || r.guardian_relationship || 'Parent/Guardian').toString().trim();
      const guardianAddress = (r.guardianAddress || r.guardian_address || '').toString().trim();
      const emergencyContact = (r.emergencyContact || r.emergency_contact || '').toString().trim();

      if (!assessmentNo) {
        errors.push(`Row ${lineNum}: Missing Assessment Number`);
        return;
      }
      if (existingAssessments.has(assessmentNo.toLowerCase())) {
        errors.push(`Row ${lineNum}: Assessment Number '${assessmentNo}' already exists in database`);
        return;
      }
      if (seenInFile.has(assessmentNo.toLowerCase())) {
        errors.push(`Row ${lineNum}: Duplicate Assessment Number '${assessmentNo}' within import file`);
        return;
      }
      seenInFile.add(assessmentNo.toLowerCase());

      if (!firstName || !lastName) {
        errors.push(`Row ${lineNum}: First name and Last name are required for student '${assessmentNo}'`);
        return;
      }
      if (!classId) {
        errors.push(`Row ${lineNum}: Class '${classNameRaw}' not recognized. Valid classes: ${existingClasses.map((c) => c.name).join(', ')}`);
        return;
      }
      if (!guardianFullName || !guardianPhoneNumber || !guardianIdNumber) {
        errors.push(`Row ${lineNum}: Guardian Name, Phone, and ID Number are required for student '${assessmentNo}'`);
        return;
      }

      validRows.push({
        student: {
          assessmentNumber: assessmentNo,
          firstName,
          middleName: middleName || null,
          lastName,
          gender,
          classId,
          admissionDate,
          previousGrade: previousGrade || null,
        },
        guardian: {
          fullName: guardianFullName,
          phoneNumber: guardianPhoneNumber,
          idNumber: guardianIdNumber,
          relationship: guardianRelationship,
          address: guardianAddress || null,
          emergencyContact: emergencyContact || null,
        },
      });
    });

    if (validRows.length === 0) {
      return { totalRows: rows.length, insertedCount: 0, errors };
    }

    let insertedCount = 0;
    await db.transaction(async (tx) => {
      for (const item of validRows) {
        const [existingGuardian] = await tx
          .select()
          .from(guardians)
          .where(eq(guardians.idNumber, item.guardian.idNumber));

        let guardianId = existingGuardian?.id;
        if (!guardianId) {
          const [newGuardian] = await tx
            .insert(guardians)
            .values({
              fullName: item.guardian.fullName,
              phoneNumber: item.guardian.phoneNumber,
              idNumber: item.guardian.idNumber,
              address: item.guardian.address,
              emergencyContact: item.guardian.emergencyContact,
              relationship: item.guardian.relationship,
              createdBy: admittedById,
            })
            .returning();
          guardianId = newGuardian.id;
        }

        await tx.insert(students).values({
          assessmentNumber: item.student.assessmentNumber,
          firstName: item.student.firstName,
          middleName: item.student.middleName,
          lastName: item.student.lastName,
          gender: item.student.gender,
          previousGrade: item.student.previousGrade,
          classId: item.student.classId,
          primaryGuardianId: guardianId,
          admissionDate: item.student.admissionDate,
          approvedById: isDirectActive ? admittedById : null,
          status: isDirectActive ? 'ACTIVE' : 'PENDING',
          createdBy: admittedById,
        });

        insertedCount++;
      }
    });

    return {
      totalRows: rows.length,
      insertedCount,
      errors,
    };
  }

  static async approveAdmission(studentId: string, approvedById: string) {
    const [updated] = await db
      .update(students)
      .set({
        status: 'ACTIVE',
        approvedById,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return updated;
  }

  static async rejectAdmission(studentId: string, reason: string, rejectedById: string) {
    const [updated] = await db
      .update(students)
      .set({
        status: 'EXPELLED',
        approvedById: rejectedById,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return updated;
  }

  static async expelStudent(studentId: string, reason: string, expelledById: string) {
    const [updated] = await db
      .update(students)
      .set({
        status: 'EXPELLED',
        approvedById: expelledById,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return updated;
  }

  static async transferStudent(studentId: string, reason: string, approvedById: string) {
    const [updated] = await db
      .update(students)
      .set({
        status: 'TRANSFERRED',
        approvedById,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return updated;
  }

  static async getPendingAdmissions() {
    return await db
      .select({
        student: students,
        guardian: guardians,
        class: classes,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.status, 'PENDING'))
      .orderBy(desc(students.createdAt));
  }

  static async getStudents() {
    return await db
      .select({
        student: students,
        guardian: guardians,
        class: classes,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(isNull(students.deletedAt))
      .orderBy(desc(students.createdAt));
  }
}

