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
      email?: string;
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
            email: guardianData.email?.trim(),
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

  static async getStudents(filters?: { classId?: string; status?: string; search?: string }) {
    return await db.select({
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
