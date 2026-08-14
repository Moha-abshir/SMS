import { db } from '../../config/db.js';
import { classes, users, subjects, teacherSubjectAllocations, userSubjects, systemSettings, eq, and, isNull } from '@school/shared';

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
        },
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // 2. Fetch all teachers for dropdown selection
    const teachersList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
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

  static async assignClassTeacher(classId: string, teacherId: string, academicYear?: number) {
    const year = academicYear || (await this.getCurrentAcademicYear());

    // 1. Update class teacher ID on classes table
    const [updatedClass] = await db
      .update(classes)
      .set({
        classTeacherId: teacherId,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, classId))
      .returning();

    if (!updatedClass) throw new Error('Class not found');

    // 2. CBC Rule: If class is PPE or LOWER_PRIMARY (Grades 1-3), auto-assign class teacher to ALL learning areas!
    if (updatedClass.levelCategory === 'PPE' || updatedClass.levelCategory === 'LOWER_PRIMARY') {
      const levelSubjects = await db
        .select()
        .from(subjects)
        .where(
          and(
            eq(subjects.levelCategory, updatedClass.levelCategory),
            isNull(subjects.deletedAt)
          )
        );

      for (const subj of levelSubjects) {
        // Check if allocation already exists
        const [existing] = await db
          .select()
          .from(teacherSubjectAllocations)
          .where(
            and(
              eq(teacherSubjectAllocations.classId, classId),
              eq(teacherSubjectAllocations.subjectId, subj.id),
              eq(teacherSubjectAllocations.academicYear, year),
              isNull(teacherSubjectAllocations.deletedAt)
            )
          );

        if (existing) {
          await db
            .update(teacherSubjectAllocations)
            .set({ teacherId, updatedAt: new Date() })
            .where(eq(teacherSubjectAllocations.id, existing.id));
        } else {
          await db.insert(teacherSubjectAllocations).values({
            teacherId,
            classId,
            subjectId: subj.id,
            academicYear: year,
          });
        }
      }
    }

    return updatedClass;
  }

  static async assignSubjectTeacher(
    classId: string,
    subjectId: string,
    teacherId: string,
    academicYear?: number
  ) {
    const year = academicYear || (await this.getCurrentAcademicYear());

    // Check if allocation already exists for this class + subject + year
    const [existing] = await db
      .select()
      .from(teacherSubjectAllocations)
      .where(
        and(
          eq(teacherSubjectAllocations.classId, classId),
          eq(teacherSubjectAllocations.subjectId, subjectId),
          eq(teacherSubjectAllocations.academicYear, year),
          isNull(teacherSubjectAllocations.deletedAt)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(teacherSubjectAllocations)
        .set({
          teacherId,
          updatedAt: new Date(),
        })
        .where(eq(teacherSubjectAllocations.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(teacherSubjectAllocations)
      .values({
        classId,
        subjectId,
        teacherId,
        academicYear: year,
      })
      .returning();

    return created;
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
