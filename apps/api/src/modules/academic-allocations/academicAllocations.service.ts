import { db } from '../../config/db.js';
import {
  invigilatorAllocations,
  markingAllocations,
  examSessions,
  examinations,
  classes,
  subjects,
  users,
  userSubjects,
  teacherSubjectAllocations,
  eq,
  isNull,
  and,
  desc,
} from '@school/shared';

export class AcademicAllocationsService {
  // --- Invigilators ---
  static async getInvigilators(examSessionId?: string) {
    let query = db
      .select({
        allocation: invigilatorAllocations,
        session: examSessions,
        class: classes,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(invigilatorAllocations)
      .innerJoin(examSessions, eq(invigilatorAllocations.examSessionId, examSessions.id))
      .innerJoin(classes, eq(invigilatorAllocations.classId, classes.id))
      .innerJoin(users, eq(invigilatorAllocations.teacherId, users.id))
      .where(isNull(invigilatorAllocations.deletedAt))
      .orderBy(desc(invigilatorAllocations.createdAt));

    return await query;
  }

  static async getAvailableInvigilators(examSessionId: string) {
    const allStaff = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
      .orderBy(users.firstName);

    // Get teachers currently booked in this session
    const busyAllocs = await db
      .select({
        teacherId: invigilatorAllocations.teacherId,
        className: classes.name,
      })
      .from(invigilatorAllocations)
      .innerJoin(classes, eq(invigilatorAllocations.classId, classes.id))
      .where(
        and(
          eq(invigilatorAllocations.examSessionId, examSessionId),
          isNull(invigilatorAllocations.deletedAt)
        )
      );

    const busyMap = new Map<string, string>();
    busyAllocs.forEach((b) => busyMap.set(b.teacherId, b.className));

    return allStaff.map((teacher) => ({
      ...teacher,
      isAvailable: !busyMap.has(teacher.id),
      assignedClass: busyMap.get(teacher.id) || null,
    }));
  }

  static async assignInvigilator(data: {
    examSessionId: string;
    classId: string;
    teacherId: string;
  }) {
    // 1. Conflict Check: is teacher already assigned to any class in this session?
    const existingSessionAlloc = await db
      .select({
        id: invigilatorAllocations.id,
        className: classes.name,
      })
      .from(invigilatorAllocations)
      .innerJoin(classes, eq(invigilatorAllocations.classId, classes.id))
      .where(
        and(
          eq(invigilatorAllocations.examSessionId, data.examSessionId),
          eq(invigilatorAllocations.teacherId, data.teacherId),
          isNull(invigilatorAllocations.deletedAt)
        )
      );

    if (existingSessionAlloc.length > 0) {
      throw new Error(
        `Invigilator Conflict: This teacher is already assigned to supervise ${existingSessionAlloc[0].className} during this time slot!`
      );
    }

    // 2. Conflict Check: does this class already have an invigilator for this session?
    const existingClassAlloc = await db
      .select({
        id: invigilatorAllocations.id,
        teacher: users,
      })
      .from(invigilatorAllocations)
      .innerJoin(users, eq(invigilatorAllocations.teacherId, users.id))
      .where(
        and(
          eq(invigilatorAllocations.examSessionId, data.examSessionId),
          eq(invigilatorAllocations.classId, data.classId),
          isNull(invigilatorAllocations.deletedAt)
        )
      );

    if (existingClassAlloc.length > 0) {
      throw new Error(
        `Class Conflict: ${existingClassAlloc[0].teacher.firstName} ${existingClassAlloc[0].teacher.lastName} is already assigned to invigilate this class!`
      );
    }

    const [created] = await db
      .insert(invigilatorAllocations)
      .values({
        examSessionId: data.examSessionId,
        classId: data.classId,
        teacherId: data.teacherId,
      })
      .returning();

    return created;
  }

  static async removeInvigilator(id: string) {
    const [deleted] = await db
      .update(invigilatorAllocations)
      .set({ deletedAt: new Date() })
      .where(eq(invigilatorAllocations.id, id))
      .returning();

    return deleted;
  }

  // --- Marking Allocations ---
  static async getMarkingAllocations() {
    return await db
      .select({
        allocation: markingAllocations,
        exam: examinations,
        subject: subjects,
        class: classes,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(markingAllocations)
      .innerJoin(examinations, eq(markingAllocations.examId, examinations.id))
      .innerJoin(subjects, eq(markingAllocations.subjectId, subjects.id))
      .innerJoin(classes, eq(markingAllocations.classId, classes.id))
      .innerJoin(users, eq(markingAllocations.teacherId, users.id))
      .where(isNull(markingAllocations.deletedAt))
      .orderBy(desc(markingAllocations.createdAt));
  }

  static async getEligibleMarkingTeachers(subjectId: string) {
    // 1. Qualified subject specialists from user_subjects
    const qualifiedUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(userSubjects)
      .innerJoin(users, eq(userSubjects.userId, users.id))
      .where(and(eq(userSubjects.subjectId, subjectId), isNull(users.deletedAt)))
      .orderBy(users.firstName);

    // 2. Active class teachers allocated to this subject
    const teachingAllocations = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
      .where(and(eq(teacherSubjectAllocations.subjectId, subjectId), isNull(users.deletedAt)))
      .orderBy(users.firstName);

    const teacherMap = new Map<string, any>();
    qualifiedUsers.forEach((u) =>
      teacherMap.set(u.id, { ...u, qualificationReason: 'Subject Specialist' })
    );
    teachingAllocations.forEach((u) => {
      if (teacherMap.has(u.id)) {
        teacherMap.set(u.id, {
          ...u,
          qualificationReason: 'Subject Specialist & Class Teacher',
        });
      } else {
        teacherMap.set(u.id, { ...u, qualificationReason: 'Active Subject Teacher' });
      }
    });

    // If no subject-specific mappings exist yet, fallback to all active teachers with a note
    if (teacherMap.size === 0) {
      const allTeachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
        .orderBy(users.firstName);

      return allTeachers.map((t) => ({ ...t, qualificationReason: 'General Faculty Teacher' }));
    }

    return Array.from(teacherMap.values());
  }

  static async assignMarking(data: {
    examId: string;
    subjectId: string;
    classId: string;
    teacherId: string;
  }) {
    // Check if class + subject + exam is already allocated
    const existingMarking = await db
      .select({
        id: markingAllocations.id,
        teacher: users,
      })
      .from(markingAllocations)
      .innerJoin(users, eq(markingAllocations.teacherId, users.id))
      .where(
        and(
          eq(markingAllocations.examId, data.examId),
          eq(markingAllocations.subjectId, data.subjectId),
          eq(markingAllocations.classId, data.classId),
          isNull(markingAllocations.deletedAt)
        )
      );

    if (existingMarking.length > 0) {
      throw new Error(
        `Marking Allocation Conflict: ${existingMarking[0].teacher.firstName} ${existingMarking[0].teacher.lastName} is already assigned to mark this class and subject!`
      );
    }

    const [created] = await db
      .insert(markingAllocations)
      .values({
        examId: data.examId,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      })
      .returning();

    return created;
  }

  static async removeMarking(id: string) {
    const [deleted] = await db
      .update(markingAllocations)
      .set({ deletedAt: new Date() })
      .where(eq(markingAllocations.id, id))
      .returning();

    return deleted;
  }
}

