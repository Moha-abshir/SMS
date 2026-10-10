import {
  TimetableBreak,
  FridaySpecialSchedule,
  TimetableCoCurricular,
  SubjectLessonRequirement,
  TimetableTeacherConstraints,
} from '@school/shared';

export interface DayPeriodSlot {
  day: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakName?: string;
}

export interface GeneratedSlot {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  isDoubleLesson: boolean;
  doubleLessonPart?: number;
}

export interface ClassSubjectTeacherItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  lessonsPerWeek: number;
  doubleLessonsCount: number;
}

export class TimetableEngine {
  /**
   * Helper to convert "HH:mm" time string to total minutes from midnight
   */
  static timeToMinutes(timeStr: string): number {
    const [hours, mins] = timeStr.split(':').map((v) => parseInt(v, 10));
    return hours * 60 + mins;
  }

  /**
   * Helper to convert total minutes from midnight to "HH:mm" string
   */
  static minutesToTime(totalMins: number): string {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Builds the daily period slots grid for each school day based on start time,
   * end time, lesson duration, break intervals, and Friday Jummah settings.
   */
  static computePeriodsGrid(config: {
    schoolDays: string[];
    startTime: string;
    endTime: string;
    lessonDurationMinutes: number;
    breaks: TimetableBreak[];
    fridaySchedule?: FridaySpecialSchedule;
  }): Map<string, DayPeriodSlot[]> {
    const gridByDay = new Map<string, DayPeriodSlot[]>();
    const lessonDuration = config.lessonDurationMinutes || 40;

    for (const day of config.schoolDays) {
      const slots: DayPeriodSlot[] = [];
      const isFriday = day.toUpperCase() === 'FRIDAY';
      const useSpecialFriday = isFriday && config.fridaySchedule?.isSpecial;

      let currentTimeMins = this.timeToMinutes(config.startTime);
      const dayEndMins = useSpecialFriday && config.fridaySchedule?.afternoonDismissalTime
        ? this.timeToMinutes(config.fridaySchedule.afternoonDismissalTime)
        : this.timeToMinutes(config.endTime);

      let currentPeriodIndex = 1;

      // Filter applicable breaks for this day
      const dayBreaks = config.breaks.filter((b) => {
        if (!b.days || b.days.length === 0 || b.days.includes('ALL')) return true;
        return b.days.map((d) => d.toUpperCase()).includes(day.toUpperCase());
      });

      // Sort breaks chronologically
      dayBreaks.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

      while (currentTimeMins + lessonDuration <= dayEndMins) {
        // Special Friday Jummah break handling
        if (useSpecialFriday && config.fridaySchedule) {
          const jummahStartMins = this.timeToMinutes(config.fridaySchedule.jummahBreakStart);
          const jummahReturnMins = this.timeToMinutes(config.fridaySchedule.afternoonReturnTime);

          // If current time hits or crosses Jummah break
          if (currentTimeMins >= jummahStartMins && currentTimeMins < jummahReturnMins) {
            slots.push({
              day,
              periodIndex: currentPeriodIndex,
              startTime: this.minutesToTime(jummahStartMins),
              endTime: this.minutesToTime(jummahReturnMins),
              isBreak: true,
              breakName: 'Jummah Prayer & Lunch Break',
            });
            currentTimeMins = jummahReturnMins;
            continue;
          }
        }

        // Check regular breaks
        const upcomingBreak = dayBreaks.find((b) => {
          const bStart = this.timeToMinutes(b.startTime);
          return currentTimeMins <= bStart && currentTimeMins + lessonDuration > bStart;
        });

        if (upcomingBreak) {
          const bStart = this.timeToMinutes(upcomingBreak.startTime);
          const bEnd = this.timeToMinutes(upcomingBreak.endTime);

          // If there is a small gap before the break starts, align to break start
          if (currentTimeMins < bStart) {
            currentTimeMins = bStart;
          }

          slots.push({
            day,
            periodIndex: currentPeriodIndex,
            startTime: this.minutesToTime(bStart),
            endTime: this.minutesToTime(bEnd),
            isBreak: true,
            breakName: upcomingBreak.name,
          });

          currentTimeMins = bEnd;
          continue;
        }

        // Standard teaching lesson slot
        const periodStartStr = this.minutesToTime(currentTimeMins);
        const periodEndStr = this.minutesToTime(currentTimeMins + lessonDuration);

        slots.push({
          day,
          periodIndex: currentPeriodIndex,
          startTime: periodStartStr,
          endTime: periodEndStr,
          isBreak: false,
        });

        currentTimeMins += lessonDuration;
        currentPeriodIndex++;
      }

      gridByDay.set(day, slots);
    }

    return gridByDay;
  }

  /**
   * Generates a conflict-free, pedagogically balanced weekly timetable.
   */
  static generate(params: {
    periodsGrid: Map<string, DayPeriodSlot[]>;
    allocations: ClassSubjectTeacherItem[];
    coCurriculars?: TimetableCoCurricular[];
    teacherConstraints?: TimetableTeacherConstraints;
  }): GeneratedSlot[] {
    const { periodsGrid, allocations, coCurriculars, teacherConstraints } = params;

    const resultSlots: GeneratedSlot[] = [];

    // Tracks: (day, periodIndex, teacherId) -> boolean
    const teacherOccupied = new Set<string>();
    // Tracks: (day, periodIndex, classId) -> boolean
    const classOccupied = new Set<string>();
    // Tracks: (classId, subjectId, day) -> count of lessons
    const classSubjectDayCount = new Map<string, number>();

    // 1. Mark co-curricular fixed slots as occupied for designated classes
    if (coCurriculars) {
      for (const cc of coCurriculars) {
        for (const clsId of cc.classIds) {
          classOccupied.add(`${cc.day}_${cc.periodIndex}_${clsId}`);
        }
      }
    }

    // Separate lessons to schedule: Double lessons first, then Single lessons
    interface SchedulingTask {
      item: ClassSubjectTeacherItem;
      isDouble: boolean;
    }

    const tasks: SchedulingTask[] = [];

    for (const alloc of allocations) {
      let remainingLessons = alloc.lessonsPerWeek;
      const doubleCount = alloc.doubleLessonsCount || 0;

      // Add double periods
      for (let i = 0; i < doubleCount && remainingLessons >= 2; i++) {
        tasks.push({ item: alloc, isDouble: true });
        remainingLessons -= 2;
      }

      // Add single periods
      for (let i = 0; i < remainingLessons; i++) {
        tasks.push({ item: alloc, isDouble: false });
      }
    }

    // Sort tasks: Double lessons first, then subjects with fewer candidate days
    tasks.sort((a, b) => {
      if (a.isDouble && !b.isDouble) return -1;
      if (!a.isDouble && b.isDouble) return 1;
      return b.item.lessonsPerWeek - a.item.lessonsPerWeek;
    });

    const schoolDays = Array.from(periodsGrid.keys());

    // Schedule each task
    for (const task of tasks) {
      const { item, isDouble } = task;
      let scheduled = false;

      // Find the best day: prioritize days where this subject is NOT yet taught for this class
      // and sort days by the fewest lessons currently scheduled for this class
      const candidateDays = [...schoolDays].sort((dayA, dayB) => {
        const countA = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${dayA}`) || 0;
        const countB = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${dayB}`) || 0;
        if (countA !== countB) return countA - countB; // Prefer day with 0 lessons of this subject

        // Secondary tie-breaker: day with fewer total lessons for this class
        let lessonsA = 0;
        let lessonsB = 0;
        for (const slot of periodsGrid.get(dayA) || []) {
          if (!slot.isBreak && classOccupied.has(`${dayA}_${slot.periodIndex}_${item.classId}`)) lessonsA++;
        }
        for (const slot of periodsGrid.get(dayB) || []) {
          if (!slot.isBreak && classOccupied.has(`${dayB}_${slot.periodIndex}_${item.classId}`)) lessonsB++;
        }
        return lessonsA - lessonsB;
      });

      // Try Pass 1 (Strict day-spreading: 1 lesson per subject per day)
      // If no slot is free in Pass 1, fall back to Pass 2 (Allow 2nd lesson on a day if needed)
      for (const allowMultipleOnSameDay of [false, true]) {
        if (scheduled) break;

        for (const day of candidateDays) {
          if (scheduled) break;

          const daySlots = periodsGrid.get(day) || [];
          const teachingSlots = daySlots.filter((s) => !s.isBreak);

          const existingOnDay = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${day}`) || 0;
          if (!allowMultipleOnSameDay && existingOnDay > 0) {
            continue; // Try strict day spreading first
          }

          if (isDouble) {
            // Look for 2 consecutive teaching slots not separated by a break
            for (let i = 0; i < teachingSlots.length - 1; i++) {
              const slot1 = teachingSlots[i];
              const slot2 = teachingSlots[i + 1];

              // Verify they are consecutive periods
              if (slot2.periodIndex !== slot1.periodIndex + 1) continue;

              const classBusy1 = classOccupied.has(`${day}_${slot1.periodIndex}_${item.classId}`);
              const classBusy2 = classOccupied.has(`${day}_${slot2.periodIndex}_${item.classId}`);
              const teacherBusy1 = teacherOccupied.has(`${day}_${slot1.periodIndex}_${item.teacherId}`);
              const teacherBusy2 = teacherOccupied.has(`${day}_${slot2.periodIndex}_${item.teacherId}`);

              if (!classBusy1 && !classBusy2 && !teacherBusy1 && !teacherBusy2) {
                // Reserve both slots
                classOccupied.add(`${day}_${slot1.periodIndex}_${item.classId}`);
                classOccupied.add(`${day}_${slot2.periodIndex}_${item.classId}`);
                teacherOccupied.add(`${day}_${slot1.periodIndex}_${item.teacherId}`);
                teacherOccupied.add(`${day}_${slot2.periodIndex}_${item.teacherId}`);

                resultSlots.push({
                  classId: item.classId,
                  subjectId: item.subjectId,
                  teacherId: item.teacherId,
                  dayOfWeek: day,
                  periodIndex: slot1.periodIndex,
                  startTime: slot1.startTime,
                  endTime: slot1.endTime,
                  isDoubleLesson: true,
                  doubleLessonPart: 1,
                });

                resultSlots.push({
                  classId: item.classId,
                  subjectId: item.subjectId,
                  teacherId: item.teacherId,
                  dayOfWeek: day,
                  periodIndex: slot2.periodIndex,
                  startTime: slot2.startTime,
                  endTime: slot2.endTime,
                  isDoubleLesson: true,
                  doubleLessonPart: 2,
                });

                classSubjectDayCount.set(
                  `${item.classId}_${item.subjectId}_${day}`,
                  existingOnDay + 2
                );

                scheduled = true;
                break;
              }
            }
          } else {
            // Single lesson
            for (const slot of teachingSlots) {
              const classBusy = classOccupied.has(`${day}_${slot.periodIndex}_${item.classId}`);
              const teacherBusy = teacherOccupied.has(`${day}_${slot.periodIndex}_${item.teacherId}`);

              if (!classBusy && !teacherBusy) {
                classOccupied.add(`${day}_${slot.periodIndex}_${item.classId}`);
                teacherOccupied.add(`${day}_${slot.periodIndex}_${item.teacherId}`);

                resultSlots.push({
                  classId: item.classId,
                  subjectId: item.subjectId,
                  teacherId: item.teacherId,
                  dayOfWeek: day,
                  periodIndex: slot.periodIndex,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isDoubleLesson: false,
                });

                classSubjectDayCount.set(
                  `${item.classId}_${item.subjectId}_${day}`,
                  existingOnDay + 1
                );

                scheduled = true;
                break;
              }
            }
          }
        }
      }

      if (!scheduled) {
        console.warn(
          `Could not fit ${isDouble ? 'double' : 'single'} period for ${item.className} - ${item.subjectName} with teacher ${item.teacherName}.`
        );
      }
    }

    return resultSlots;
  }
}
