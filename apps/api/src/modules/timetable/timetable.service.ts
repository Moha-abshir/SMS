import argon2 from 'argon2';
import { db } from '../../config/db.js';
import {
  timetableSettings,
  timetableSlots,
  classes,
  subjects,
  users,
  teacherSubjectAllocations,
  systemSettings,
  academicTerms,
  eq,
  and,
  ne,
  isNull,
  inArray,
  SubjectLessonRequirement,
  FridaySpecialSchedule,
  TimetableCoCurricular,
  TimetableTeacherConstraints,
} from '@school/shared';
import { TimetableEngine, ClassSubjectTeacherItem } from './timetable.engine.js';

export class TimetableService {
  static async getCurrentAcademicYearAndTerm() {
    const [currentTermRecord] = await db
      .select()
      .from(academicTerms)
      .where(and(eq(academicTerms.isCurrent, true), isNull(academicTerms.deletedAt)))
      .limit(1);

    if (currentTermRecord) {
      return { academicYear: currentTermRecord.year, term: currentTermRecord.termNumber };
    }

    const [settings] = await db.select().from(systemSettings).limit(1);
    const academicYear = settings?.currentAcademicYear || 2026;
    return { academicYear, term: 1 };
  }

  /**
   * Returns clean target classes list for Grades 4 to 9.
   */
  static async getTargetClasses() {
    return db
      .select({
        id: classes.id,
        name: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
      })
      .from(classes)
      .where(
        and(
          inArray(classes.levelCategory, ['UPPER_PRIMARY', 'JUNIOR']),
          isNull(classes.deletedAt)
        )
      )
      .orderBy(classes.numericOrder);
  }

  /**
   * Verifies whether all subjects for Grades 4 to 9 have assigned teachers before timetable creation.
   */
  static async checkAllocationsStatus(academicYear?: number) {
    const current = await this.getCurrentAcademicYearAndTerm();
    const year = academicYear || current.academicYear;

    const targetClasses = await this.getTargetClasses();
    if (targetClasses.length === 0) {
      return {
        isReady: false,
        totalRequired: 0,
        totalAllocated: 0,
        missing: [],
        message: 'No Upper Primary or Junior Secondary classes found.',
      };
    }

    const classIds = targetClasses.map((c) => c.id);
    const targetSubjects = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.deletedAt));

    const currentAllocations = await db
      .select({
        classId: teacherSubjectAllocations.classId,
        subjectId: teacherSubjectAllocations.subjectId,
      })
      .from(teacherSubjectAllocations)
      .where(
        and(
          inArray(teacherSubjectAllocations.classId, classIds),
          eq(teacherSubjectAllocations.academicYear, year),
          isNull(teacherSubjectAllocations.deletedAt)
        )
      );

    const missing: Array<{ className: string; subjectName: string; subjectCode: string }> = [];
    let totalRequired = 0;

    targetClasses.forEach((cls) => {
      const levelSubjects = targetSubjects.filter((s) => s.levelCategory === cls.levelCategory);
      levelSubjects.forEach((sub) => {
        totalRequired++;
        const isAllocated = currentAllocations.some(
          (a) => a.classId === cls.id && a.subjectId === sub.id
        );
        if (!isAllocated) {
          missing.push({
            className: cls.name,
            subjectName: sub.name,
            subjectCode: sub.code,
          });
        }
      });
    });

    const isReady = missing.length === 0 && currentAllocations.length > 0;

    return {
      isReady,
      totalRequired,
      totalAllocated: currentAllocations.length,
      missing,
    };
  }

  /**
   * Fetches timetable configuration for a given term, or returns standard defaults.
   */
  static async getConfig(academicYear?: number, term?: number) {
    const current = await this.getCurrentAcademicYearAndTerm();
    const year = academicYear || current.academicYear;
    const t = term || current.term;

    const [existing] = await db
      .select()
      .from(timetableSettings)
      .where(and(eq(timetableSettings.academicYear, year), eq(timetableSettings.term, t), isNull(timetableSettings.deletedAt)))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Default configuration (Kenyan CBC Standard Schedule with Friday Jumuaa)
    return {
      academicYear: year,
      term: t,
      schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      startTime: '08:00',
      endTime: '15:40',
      lessonDurationMinutes: 40,
      breaks: [
        {
          id: 'break-1',
          name: 'Morning Tea Break',
          startTime: '10:00',
          endTime: '10:30',
          days: ['ALL'],
        },
        {
          id: 'break-2',
          name: 'Lunch & Dhuhr Break',
          startTime: '12:30',
          endTime: '13:30',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'],
        },
      ],
      fridaySchedule: {
        isSpecial: true,
        jummahBreakStart: '12:30',
        afternoonReturnTime: '14:00', // Return at 2:00 PM for afternoon class
        afternoonDismissalTime: '15:30',
      },
      coCurriculars: [
        {
          id: 'cocurr-1',
          name: 'Games & Physical Education',
          day: 'THURSDAY',
          periodIndex: 8,
          classIds: [],
        },
      ],
      subjectRequirements: {},
      teacherConstraints: {
        maxConsecutiveLessons: 3,
        minFreePeriodsPerWeek: 5,
        specialStaffLimits: {},
      },
      isActive: true,
    };
  }

  /**
   * Saves or updates the timetable configuration for a term.
   */
  static async saveConfig(data: any) {
    const current = await this.getCurrentAcademicYearAndTerm();
    const year = data.academicYear || current.academicYear;
    const t = data.term || current.term;

    const [existing] = await db
      .select()
      .from(timetableSettings)
      .where(and(eq(timetableSettings.academicYear, year), eq(timetableSettings.term, t), isNull(timetableSettings.deletedAt)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(timetableSettings)
        .set({
          schoolDays: data.schoolDays,
          startTime: data.startTime,
          endTime: data.endTime,
          lessonDurationMinutes: data.lessonDurationMinutes,
          breaks: data.breaks,
          fridaySchedule: data.fridaySchedule,
          coCurriculars: data.coCurriculars || [],
          subjectRequirements: data.subjectRequirements || {},
          teacherConstraints: data.teacherConstraints || {},
          isActive: data.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(timetableSettings.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(timetableSettings)
      .values({
        academicYear: year,
        term: t,
        schoolDays: data.schoolDays,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonDurationMinutes: data.lessonDurationMinutes,
        breaks: data.breaks,
        fridaySchedule: data.fridaySchedule,
        coCurriculars: data.coCurriculars || [],
        subjectRequirements: data.subjectRequirements || {},
        teacherConstraints: data.teacherConstraints || {},
        isActive: data.isActive ?? true,
      })
      .returning();

    return created;
  }

  /**
   * Generates and commits a live timetable for Grades 4 through 9 with password authorization.
   */
  static async generate(academicYear?: number, term?: number, userId?: string, password?: string) {
    if (userId) {
      if (!password || typeof password !== 'string' || password.trim() === '') {
        const err: any = new Error('Deputy password is required to authorize timetable generation.');
        err.statusCode = 401;
        throw err;
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        const err: any = new Error('User not found.');
        err.statusCode = 404;
        throw err;
      }
      const isMatch = await argon2.verify(user.passwordHash, password);
      if (!isMatch) {
        const err: any = new Error('Incorrect password. Deputy authorization is required to generate the timetable.');
        err.statusCode = 401;
        throw err;
      }
    }

    const current = await this.getCurrentAcademicYearAndTerm();
    const year = academicYear || current.academicYear;
    const t = term || current.term;

    // 1. Get or create timetable configuration
    const config = await this.getConfig(year, t);

    // 2. Fetch target classes: Grades 4 to 9 (UPPER_PRIMARY and JUNIOR)
    const targetClasses = await db
      .select()
      .from(classes)
      .where(
        and(
          inArray(classes.levelCategory, ['UPPER_PRIMARY', 'JUNIOR']),
          isNull(classes.deletedAt)
        )
      )
      .orderBy(classes.numericOrder);

    if (targetClasses.length === 0) {
      throw new Error('No Upper Primary or Junior Secondary classes found to generate timetable for.');
    }

    const classIds = targetClasses.map((c) => c.id);

    // 3. Fetch active teacher-subject allocations for these classes
    const allocations = await db
      .select({
        classId: teacherSubjectAllocations.classId,
        className: classes.name,
        subjectId: teacherSubjectAllocations.subjectId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        teacherId: teacherSubjectAllocations.teacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(classes, eq(teacherSubjectAllocations.classId, classes.id))
      .innerJoin(subjects, eq(teacherSubjectAllocations.subjectId, subjects.id))
      .innerJoin(users, eq(teacherSubjectAllocations.teacherId, users.id))
      .where(
        and(
          inArray(teacherSubjectAllocations.classId, classIds),
          eq(teacherSubjectAllocations.academicYear, year),
          isNull(teacherSubjectAllocations.deletedAt)
        )
      );

    if (allocations.length === 0) {
      throw new Error(
        'No subject teacher allocations found for Grades 4 to 9. Please allocate teachers in the Academic Allocations workspace first.'
      );
    }

    // 4. Default CBC lesson allocations per subject code if not overridden
    const defaultLessonsByCode: Record<string, { lessons: number; doubleLessons: number }> = {
      // Mathematics & Sciences
      'UP-MATH': { lessons: 5, doubleLessons: 0 },
      'JSS-MATH': { lessons: 5, doubleLessons: 0 },
      'UP-SCITECH': { lessons: 4, doubleLessons: 1 },
      'JSS-INTSCI': { lessons: 4, doubleLessons: 1 },

      // Languages
      'UP-ENG': { lessons: 5, doubleLessons: 0 },
      'JSS-ENG': { lessons: 5, doubleLessons: 0 },
      'UP-KISW': { lessons: 4, doubleLessons: 0 },
      'JSS-KISW': { lessons: 4, doubleLessons: 0 },

      // Humanities & Social
      'UP-SOC': { lessons: 3, doubleLessons: 0 },
      'JSS-SOC': { lessons: 3, doubleLessons: 0 },
      'UP-IRE': { lessons: 3, doubleLessons: 0 },
      'JSS-IRE': { lessons: 3, doubleLessons: 0 },
      'UP-ARAB': { lessons: 3, doubleLessons: 0 },
      'JSS-ARAB': { lessons: 3, doubleLessons: 0 },

      // Technical & Creative
      'UP-AGRINUT': { lessons: 3, doubleLessons: 1 },
      'JSS-AGRINUT': { lessons: 3, doubleLessons: 1 },
      'UP-ARTS': { lessons: 3, doubleLessons: 1 },
      'JSS-ARTSPORT': { lessons: 3, doubleLessons: 1 },
      'UP-PHE': { lessons: 2, doubleLessons: 0 },
      'JSS-HLTH': { lessons: 2, doubleLessons: 0 },
      'JSS-PRETECH': { lessons: 3, doubleLessons: 1 },
      'JSS-COMP': { lessons: 3, doubleLessons: 1 },
    };

    const reqMap = (config.subjectRequirements as Record<string, Record<string, SubjectLessonRequirement>>) || {};

    // 5. Build allocation items list
    const schedulingItems: ClassSubjectTeacherItem[] = allocations.map((a) => {
      const customReq = reqMap[a.classId]?.[a.subjectId];
      const defaultReq = defaultLessonsByCode[a.subjectCode] || { lessons: 4, doubleLessons: 0 };

      return {
        classId: a.classId,
        className: a.className,
        subjectId: a.subjectId,
        subjectCode: a.subjectCode,
        subjectName: a.subjectName,
        teacherId: a.teacherId,
        teacherName: `${a.teacherFirstName} ${a.teacherLastName}`,
        lessonsPerWeek: customReq?.lessonsPerWeek ?? defaultReq.lessons,
        doubleLessonsCount: customReq?.doubleLessonsCount ?? defaultReq.doubleLessons,
      };
    });

    // 6. Compute periods grid
    const periodsGrid = TimetableEngine.computePeriodsGrid({
      schoolDays: config.schoolDays,
      startTime: config.startTime,
      endTime: config.endTime,
      lessonDurationMinutes: config.lessonDurationMinutes,
      breaks: config.breaks,
      fridaySchedule: (config.fridaySchedule as FridaySpecialSchedule | undefined) || undefined,
    });

    // 7. Run generation algorithm
    const generatedSlots = TimetableEngine.generate({
      periodsGrid,
      allocations: schedulingItems,
      coCurriculars: (config.coCurriculars as TimetableCoCurricular[] | undefined) || undefined,
      teacherConstraints: (config.teacherConstraints as TimetableTeacherConstraints | undefined) || undefined,
    });

    // 8. Atomic commit: clear existing slots and insert generated ones
    await db.transaction(async (tx) => {
      await tx
        .delete(timetableSlots)
        .where(and(eq(timetableSlots.academicYear, year), eq(timetableSlots.term, t)));

      if (generatedSlots.length > 0) {
        for (let i = 0; i < generatedSlots.length; i += 50) {
          const batch = generatedSlots.slice(i, i + 50).map((s) => ({
            academicYear: year,
            term: t,
            classId: s.classId,
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            dayOfWeek: s.dayOfWeek,
            periodIndex: s.periodIndex,
            startTime: s.startTime,
            endTime: s.endTime,
            isDoubleLesson: s.isDoubleLesson,
            doubleLessonPart: s.doubleLessonPart || null,
          }));

          await tx.insert(timetableSlots).values(batch);
        }
      }
    });

    return {
      success: true,
      count: generatedSlots.length,
      academicYear: year,
      term: t,
      message: `Successfully generated ${generatedSlots.length} timetable periods for Grades 4 to 9.`,
    };
  }

  /**
   * Fetches the Master School Timetable for the Deputy Head Teacher.
   */
  static async getMasterTimetable(academicYear?: number, term?: number) {
    const current = await this.getCurrentAcademicYearAndTerm();
    const year = academicYear || current.academicYear;
    const t = term || current.term;

    const config = await this.getConfig(year, t);
    const periodsGrid = TimetableEngine.computePeriodsGrid({
      schoolDays: config.schoolDays,
      startTime: config.startTime,
      endTime: config.endTime,
      lessonDurationMinutes: config.lessonDurationMinutes,
      breaks: config.breaks,
      fridaySchedule: (config.fridaySchedule as FridaySpecialSchedule | undefined) || undefined,
    });

    const periodsObj: Record<string, any[]> = {};
    for (const [day, slots] of periodsGrid.entries()) {
      periodsObj[day] = slots;
    }

    const targetClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
      })
      .from(classes)
      .where(and(inArray(classes.levelCategory, ['UPPER_PRIMARY', 'JUNIOR']), isNull(classes.deletedAt)))
      .orderBy(classes.numericOrder);

    const slots = await db
      .select({
        id: timetableSlots.id,
        classId: timetableSlots.classId,
        subjectId: timetableSlots.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherId: timetableSlots.teacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        dayOfWeek: timetableSlots.dayOfWeek,
        periodIndex: timetableSlots.periodIndex,
        startTime: timetableSlots.startTime,
        endTime: timetableSlots.endTime,
        isDoubleLesson: timetableSlots.isDoubleLesson,
        doubleLessonPart: timetableSlots.doubleLessonPart,
      })
      .from(timetableSlots)
      .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
      .innerJoin(users, eq(timetableSlots.teacherId, users.id))
      .where(and(eq(timetableSlots.academicYear, year), eq(timetableSlots.term, t), isNull(timetableSlots.deletedAt)));

    return {
      academicYear: year,
      term: t,
      config,
      periodsGrid: periodsObj,
      classes: targetClasses,
      slots,
    };
  }

  /**
   * Fetches the weekly timetable for a specific class (e.g., Grade 7).
   */
  static async getClassTimetable(classId: string, academicYear?: number, term?: number) {
    const current = await this.getCurrentAcademicYearAndTerm();
    const year = academicYear || current.academicYear;
    const t = term || current.term;

    const [classInfo] = await db.select().from(classes).where(eq(classes.id, classId));
    if (!classInfo) throw new Error('Class not found');

    const config = await this.getConfig(year, t);
    const periodsGrid = TimetableEngine.computePeriodsGrid({
      schoolDays: config.schoolDays,
      startTime: config.startTime,
      endTime: config.endTime,
      lessonDurationMinutes: config.lessonDurationMinutes,
      breaks: config.breaks,
      fridaySchedule: (config.fridaySchedule as FridaySpecialSchedule | undefined) || undefined,
    });

    const periodsObj: Record<string, any[]> = {};
    for (const [day, slots] of periodsGrid.entries()) {
      periodsObj[day] = slots;
    }

    const slots = await db
      .select({
        id: timetableSlots.id,
        classId: timetableSlots.classId,
        subjectId: timetableSlots.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherId: timetableSlots.teacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        dayOfWeek: timetableSlots.dayOfWeek,
        periodIndex: timetableSlots.periodIndex,
        startTime: timetableSlots.startTime,
        endTime: timetableSlots.endTime,
        isDoubleLesson: timetableSlots.isDoubleLesson,
        doubleLessonPart: timetableSlots.doubleLessonPart,
      })
      .from(timetableSlots)
      .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
      .innerJoin(users, eq(timetableSlots.teacherId, users.id))
      .where(
        and(
          eq(timetableSlots.classId, classId),
          eq(timetableSlots.academicYear, year),
          eq(timetableSlots.term, t),
          isNull(timetableSlots.deletedAt)
        )
      );

    return {
      class: classInfo,
      academicYear: year,
      term: t,
      config,
      periodsGrid: periodsObj,
      slots,
    };
  }

  /**
   * Fetches personal weekly timetable for a teacher.
   */
  static async getTeacherTimetable(teacherId: string, academicYear?: number, term?: number) {
    const current = await this.getCurrentAcademicYearAndTerm();
    const year = academicYear || current.academicYear;
    const t = term || current.term;

    const [teacherInfo] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        tscNumber: users.tscNumber,
      })
      .from(users)
      .where(eq(users.id, teacherId));

    if (!teacherInfo) throw new Error('Teacher not found');

    const config = await this.getConfig(year, t);
    const periodsGrid = TimetableEngine.computePeriodsGrid({
      schoolDays: config.schoolDays,
      startTime: config.startTime,
      endTime: config.endTime,
      lessonDurationMinutes: config.lessonDurationMinutes,
      breaks: config.breaks,
      fridaySchedule: (config.fridaySchedule as FridaySpecialSchedule | undefined) || undefined,
    });

    const periodsObj: Record<string, any[]> = {};
    for (const [day, slots] of periodsGrid.entries()) {
      periodsObj[day] = slots;
    }

    const slots = await db
      .select({
        id: timetableSlots.id,
        classId: timetableSlots.classId,
        className: classes.name,
        subjectId: timetableSlots.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        dayOfWeek: timetableSlots.dayOfWeek,
        periodIndex: timetableSlots.periodIndex,
        startTime: timetableSlots.startTime,
        endTime: timetableSlots.endTime,
        isDoubleLesson: timetableSlots.isDoubleLesson,
        doubleLessonPart: timetableSlots.doubleLessonPart,
      })
      .from(timetableSlots)
      .innerJoin(classes, eq(timetableSlots.classId, classes.id))
      .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
      .where(
        and(
          eq(timetableSlots.teacherId, teacherId),
          eq(timetableSlots.academicYear, year),
          eq(timetableSlots.term, t),
          isNull(timetableSlots.deletedAt)
        )
      );

    return {
      teacher: teacherInfo,
      academicYear: year,
      term: t,
      config,
      periodsGrid: periodsObj,
      slots,
    };
  }

  /**
   * Validates whether swapping or moving a slot causes a teacher double-booking.
   */
  static async validateMovement(
    slotId: string,
    targetDay: string,
    targetPeriodIndex: number,
    excludeSlotId?: string
  ) {
    const [sourceSlot] = await db
      .select({
        id: timetableSlots.id,
        academicYear: timetableSlots.academicYear,
        term: timetableSlots.term,
        teacherId: timetableSlots.teacherId,
        classId: timetableSlots.classId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(timetableSlots)
      .innerJoin(users, eq(timetableSlots.teacherId, users.id))
      .where(eq(timetableSlots.id, slotId));

    if (!sourceSlot) throw new Error('Slot not found');

    const conditions = [
      eq(timetableSlots.academicYear, sourceSlot.academicYear),
      eq(timetableSlots.term, sourceSlot.term),
      eq(timetableSlots.teacherId, sourceSlot.teacherId),
      eq(timetableSlots.dayOfWeek, targetDay),
      eq(timetableSlots.periodIndex, targetPeriodIndex),
      ne(timetableSlots.id, slotId),
      isNull(timetableSlots.deletedAt),
    ];
    if (excludeSlotId) {
      conditions.push(ne(timetableSlots.id, excludeSlotId));
    }

    const [clashingTeacherSlot] = await db
      .select({
        className: classes.name,
        subjectName: subjects.name,
      })
      .from(timetableSlots)
      .innerJoin(classes, eq(timetableSlots.classId, classes.id))
      .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
      .where(and(...conditions));

    if (clashingTeacherSlot) {
      return {
        hasConflict: true,
        message: `${sourceSlot.teacherFirstName} ${sourceSlot.teacherLastName} is already scheduled to teach ${clashingTeacherSlot.className} (${clashingTeacherSlot.subjectName}) during Period ${targetPeriodIndex} on ${targetDay}.`,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Swaps two timetable slots with collision safety checks.
   */
  static async swapSlots(slotAId: string, slotBId: string, force: boolean = false) {
    const [slotA] = await db.select().from(timetableSlots).where(eq(timetableSlots.id, slotAId));
    const [slotB] = await db.select().from(timetableSlots).where(eq(timetableSlots.id, slotBId));

    if (!slotA || !slotB) throw new Error('One or both slots not found');

    // Verify teacher collision for slot A moving to slot B's time (ignoring slot B itself)
    const validationA = await this.validateMovement(slotAId, slotB.dayOfWeek, slotB.periodIndex, slotBId);
    if (validationA.hasConflict && !force) {
      return { success: false, hasConflict: true, message: validationA.message };
    }

    // Verify teacher collision for slot B moving to slot A's time (ignoring slot A itself)
    const validationB = await this.validateMovement(slotBId, slotA.dayOfWeek, slotA.periodIndex, slotAId);
    if (validationB.hasConflict && !force) {
      return { success: false, hasConflict: true, message: validationB.message };
    }

    await db.transaction(async (tx) => {
      // Step 1: Temporarily park slot A at periodIndex = -999 to free its slot for slot B
      await tx
        .update(timetableSlots)
        .set({
          periodIndex: -999,
          updatedAt: new Date(),
        })
        .where(eq(timetableSlots.id, slotA.id));

      // Step 2: Move slot B to slot A's original position
      await tx
        .update(timetableSlots)
        .set({
          dayOfWeek: slotA.dayOfWeek,
          periodIndex: slotA.periodIndex,
          startTime: slotA.startTime,
          endTime: slotA.endTime,
          updatedAt: new Date(),
        })
        .where(eq(timetableSlots.id, slotB.id));

      // Step 3: Move slot A from temporary position to slot B's original position
      await tx
        .update(timetableSlots)
        .set({
          dayOfWeek: slotB.dayOfWeek,
          periodIndex: slotB.periodIndex,
          startTime: slotB.startTime,
          endTime: slotB.endTime,
          updatedAt: new Date(),
        })
        .where(eq(timetableSlots.id, slotA.id));
    });

    return {
      success: true,
      hasConflict: false,
      message: (validationA.hasConflict || validationB.hasConflict)
        ? 'Slots swapped with collision acknowledged.'
        : 'Slots swapped successfully.',
    };
  }
}
