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
  inArray,
  isSelfContainedClass,
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

  static async getEligibleMarkingTeachers(subjectId: string, classId?: string) {
    // 1. Current teacher teaching this subject to this specific class stream
    let classSubjectTeacherId: string | null = null;
    if (classId) {
      const [cur] = await db
        .select({ teacherId: teacherSubjectAllocations.teacherId })
        .from(teacherSubjectAllocations)
        .where(
          and(
            eq(teacherSubjectAllocations.subjectId, subjectId),
            eq(teacherSubjectAllocations.classId, classId),
            isNull(teacherSubjectAllocations.deletedAt)
          )
        );
      if (cur) {
        classSubjectTeacherId = cur.teacherId;
      }
    }

    // 2. Qualified subject specialists from user_subjects
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

    // 3. Active teachers allocated to this subject across the school
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

    // 4. All active staff
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

    const qualifiedIds = new Set(qualifiedUsers.map((u) => u.id));
    const teachingIds = new Set(teachingAllocations.map((u) => u.id));

    const result = allTeachers.map((t) => {
      let priority = 3;
      let qualificationReason = 'Faculty Teacher';
      let isBestMatch = false;
      let isQualified = false;

      if (classSubjectTeacherId && t.id === classSubjectTeacherId) {
        priority = 1;
        qualificationReason = 'Class Subject Teacher (Best Match)';
        isBestMatch = true;
        isQualified = true;
      } else if (qualifiedIds.has(t.id)) {
        priority = 2;
        qualificationReason = 'Subject Specialist';
        isQualified = true;
      } else if (teachingIds.has(t.id)) {
        priority = 2;
        qualificationReason = 'Subject Teacher (Other Classes)';
        isQualified = true;
      }

      return {
        ...t,
        priority,
        qualificationReason,
        isBestMatch,
        isQualified,
      };
    });

    return result.sort((a, b) => a.priority - b.priority || a.firstName.localeCompare(b.firstName));
  }

  // --- Pre-Primary & Lower Primary (PP1 - Grade 3) Self-Contained Marking Roster ---
  static async getSelfContainedRoster() {
    // 1. Fetch PP1, PP2, Grade 1, Grade 2, Grade 3 classes
    const classesList = await db
      .select({
        class: classes,
        classTeacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(
        and(
          inArray(classes.levelCategory, ['PPE', 'LOWER_PRIMARY']),
          isNull(classes.deletedAt)
        )
      )
      .orderBy(classes.numericOrder);

    // 2. Fetch all subjects for PPE and LOWER_PRIMARY
    const subjectsList = await db
      .select()
      .from(subjects)
      .where(
        and(
          inArray(subjects.levelCategory, ['PPE', 'LOWER_PRIMARY']),
          isNull(subjects.deletedAt)
        )
      )
      .orderBy(subjects.name);

    return classesList.map((item) => ({
      ...item,
      subjects: subjectsList.filter((s) => s.levelCategory === item.class.levelCategory),
    }));
  }

  static async assignMarking(data: {
    examId: string;
    subjectId: string;
    classId: string;
    teacherId: string;
  }) {
    // Verify target class is not a self-contained class (PP1 - Grade 3)
    const [targetClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, data.classId));

    if (!targetClass) {
      throw new Error('Class not found');
    }

    if (isSelfContainedClass(targetClass)) {
      throw new Error(
        `Automated Marking Notice: ${targetClass.name} is a Pre-Primary/Lower Primary class. All subjects are marked exclusively by the assigned Class Teacher.`
      );
    }

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
      if (existingMarking[0].teacher.id === data.teacherId) {
        return existingMarking[0];
      }
      const [updated] = await db
        .update(markingAllocations)
        .set({
          teacherId: data.teacherId,
          updatedAt: new Date(),
        })
        .where(eq(markingAllocations.id, existingMarking[0].id))
        .returning();

      return updated;
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

