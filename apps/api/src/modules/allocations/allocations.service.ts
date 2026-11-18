import { db } from '../../config/db.js';
import { classes, users, roles, subjects, teacherSubjectAllocations, userSubjects, systemSettings, eq, and, isNull, sql } from '@school/shared';

export class AllocationsService {
  static async getCurrentAcademicYear() {
    const [settings] = await db.select().from(systemSettings).limit(1);
    return settings?.currentAcademicYear || 2026;
  }

  static async getAllocations(academicYear?: number) {
    const year = academicYear || (await this.getCurrentAcademicYear());

    // 1. Fetch all classes with their class teacher
    const classList = await db
      .select({
        class: classes,
        classTeacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // 2. Fetch all teachers for dropdown selection (including their roleName)
    const teachersList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)));

    // 3. Fetch all subjects
    const subjectsList = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt));

    // 4. Fetch teacher-subject qualifications
    const qualifications = await db.select().from(userSubjects);

    // 5. Fetch current subject allocations for the academic year
    const subjectAllocations = await db
      .select({
        allocation: teacherSubjectAllocations,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
        subject: subjects,
        class: classes,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
      .innerJoin(subjects, eq(teacherSubjectAllocations.subjectId, subjects.id))
      .innerJoin(classes, eq(teacherSubjectAllocations.classId, classes.id))
      .where(
        and(
          eq(teacherSubjectAllocations.academicYear, year),
          isNull(teacherSubjectAllocations.deletedAt)
        )
      );

    return {
      academicYear: year,
      classes: classList,
      teachers: teachersList,
      subjects: subjectsList,
      qualifications,
      subjectAllocations,
    };
  }

  static async assignClassTeacher(classId: string, teacherId?: string | null, academicYear?: number) {
    const year = academicYear || (await this.getCurrentAcademicYear());
    return db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`allocation:${classId}:${year}`}, 0))`);

      const normalizedTeacherId = teacherId && teacherId.trim() !== '' ? teacherId.trim() : null;

    // 1. Update class teacher ID on classes table
      const [updatedClass] = await tx
        .update(classes)
        .set({
          classTeacherId: normalizedTeacherId,
          updatedAt: new Date(),
        })
        .where(eq(classes.id, classId))
        .returning();

      if (!updatedClass) throw new Error('Class not found');

    // 2. CBC Rule: If class is PPE or LOWER_PRIMARY (Grades 1-3)
      if (updatedClass.levelCategory === 'PPE' || updatedClass.levelCategory === 'LOWER_PRIMARY') {
        if (!normalizedTeacherId) {
          // Teacher unassigned: soft-delete auto-allocated subject records for this class in this academic year
          await tx
            .update(teacherSubjectAllocations)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(
              and(
                eq(teacherSubjectAllocations.classId, classId),
                eq(teacherSubjectAllocations.academicYear, year),
                isNull(teacherSubjectAllocations.deletedAt)
              )
            );
        } else {
          const levelSubjects = await tx
            .select()
            .from(subjects)
            .where(
              and(
                eq(subjects.levelCategory, updatedClass.levelCategory),
                isNull(subjects.deletedAt)
              )
            );

          await tx.update(teacherSubjectAllocations).set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(teacherSubjectAllocations.classId, classId), eq(teacherSubjectAllocations.academicYear, year), isNull(teacherSubjectAllocations.deletedAt)));
          if (levelSubjects.length) await tx.insert(teacherSubjectAllocations).values(levelSubjects.map(subject => ({
            teacherId: normalizedTeacherId, classId, subjectId: subject.id, academicYear: year,
          }))).onConflictDoUpdate({ target: [teacherSubjectAllocations.academicYear, teacherSubjectAllocations.classId, teacherSubjectAllocations.subjectId, teacherSubjectAllocations.teacherId],
            set: { deletedAt: null, updatedAt: new Date() } });
        }
      }

      return updatedClass;

    });
  }

  static async assignSubjectTeacher(
    classId: string,
    subjectId: string,
    teacherId: string,
    academicYear?: number
  ) {
    const year = academicYear || (await this.getCurrentAcademicYear());
    return db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`allocation:${classId}:${year}`}, 0))`);

    // 1. Strict Qualification Validation: Teacher MUST be qualified in user_subjects
      const [qualification] = await tx
        .select()
        .from(userSubjects)
        .where(and(eq(userSubjects.userId, teacherId), eq(userSubjects.subjectId, subjectId)))
        .limit(1);

      if (!qualification) {
        const [teacher] = await tx.select().from(users).where(eq(users.id, teacherId)).limit(1);
        const [subject] = await tx.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
        const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'This teacher';
        const subjectName = subject ? `${subject.name} (${subject.code})` : 'this subject';
        throw new Error(
          `Cannot allocate: ${teacherName} is not qualified/certified to teach ${subjectName}. Only certified subject specialists can be assigned.`
        );
      }

      await tx.update(teacherSubjectAllocations).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(teacherSubjectAllocations.classId, classId), eq(teacherSubjectAllocations.subjectId, subjectId), eq(teacherSubjectAllocations.academicYear, year), isNull(teacherSubjectAllocations.deletedAt)));
      const [created] = await tx.insert(teacherSubjectAllocations).values({ classId, subjectId, teacherId, academicYear: year })
        .onConflictDoUpdate({ target: [teacherSubjectAllocations.academicYear, teacherSubjectAllocations.classId, teacherSubjectAllocations.subjectId, teacherSubjectAllocations.teacherId], set: { deletedAt: null, updatedAt: new Date() } }).returning();

      return created;

    });
  }

  static async removeSubjectAllocation(id: string) {
    const [deleted] = await db
      .update(teacherSubjectAllocations)
      .set({ deletedAt: new Date() })
      .where(eq(teacherSubjectAllocations.id, id))
      .returning();

    return deleted;
  }
}
