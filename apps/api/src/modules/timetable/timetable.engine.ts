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

export interface GenerationReportItem {
  className: string;
  subjectName: string;
  teacherName: string;
  reason: string;
}

export interface GenerationResult {
  slots: GeneratedSlot[];
  totalRequiredLessons: number;
  totalPlacedLessons: number;
  unplacedLessons: GenerationReportItem[];
}

export class TimetableEngine {
  /**
   * Helper to convert "HH:mm" time string to total minutes from midnight
   */
  static timeToMinutes(timeStr?: string | null): number {
    if (!timeStr) return 0;
    const [hours, mins] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
    return (hours || 0) * 60 + (mins || 0);
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
    const lessonDuration = Math.max(15, Number(config.lessonDurationMinutes) || 40);

    // Sanitize valid breaks (strictly positive duration)
    const validBreaks = (config.breaks || []).filter((b) => {
      if (!b || !b.startTime || !b.endTime) return false;
      const bStart = this.timeToMinutes(b.startTime);
      const bEnd = this.timeToMinutes(b.endTime);
      return bStart > 0 && bEnd > bStart;
    });

    // Sanitize Friday Jummah schedule
    const isFridaySpecial = Boolean(config.fridaySchedule?.isSpecial);
    const jummahStartMins = this.timeToMinutes(config.fridaySchedule?.jummahBreakStart || '');
    const jummahReturnMins = this.timeToMinutes(config.fridaySchedule?.afternoonReturnTime || '');
    const validJummah = isFridaySpecial && jummahStartMins > 0 && jummahReturnMins > jummahStartMins;
    const fridayDismissalMins = this.timeToMinutes(config.fridaySchedule?.afternoonDismissalTime || '');

    for (const day of config.schoolDays) {
      const slots: DayPeriodSlot[] = [];
      const isFriday = day.toUpperCase() === 'FRIDAY';
      const dayStartMins = this.timeToMinutes(config.startTime) || 480;
      const defaultEndMins = this.timeToMinutes(config.endTime) || 940;

      const dayEndMins =
        isFriday && validJummah && fridayDismissalMins > dayStartMins
          ? fridayDismissalMins
          : defaultEndMins;

      if (dayEndMins <= dayStartMins + lessonDuration) {
        gridByDay.set(day, []);
        continue;
      }

      let currentPeriodIndex = 1;

      // Filter applicable breaks for this day
      const dayBreaks = validBreaks.filter((b) => {
        if (!b.days || b.days.length === 0 || b.days.includes('ALL')) return true;
        return b.days.map((d) => d.toUpperCase()).includes(day.toUpperCase());
      });

      // Sort breaks chronologically
      dayBreaks.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

      let currentTimeMins = dayStartMins;
      let watchdog = 0;

      while (currentTimeMins + lessonDuration <= dayEndMins) {
        if (++watchdog > 100) break; // Hard safety watchdog to guarantee zero hangs

        // Special Friday Jummah break handling
        if (isFriday && validJummah) {
          if (currentTimeMins < jummahReturnMins && currentTimeMins + lessonDuration > jummahStartMins) {
            slots.push({
              day,
              periodIndex: currentPeriodIndex,
              startTime: this.minutesToTime(jummahStartMins),
              endTime: this.minutesToTime(jummahReturnMins),
              isBreak: true,
              breakName: 'Jummah Prayer & Lunch Break',
            });
            currentTimeMins = Math.max(currentTimeMins + 1, jummahReturnMins);
            continue;
          }
        }

        // Check regular breaks
        const upcomingBreak = dayBreaks.find((b) => {
          const bStart = this.timeToMinutes(b.startTime);
          const bEnd = this.timeToMinutes(b.endTime);
          return currentTimeMins < bEnd && currentTimeMins + lessonDuration > bStart;
        });

        if (upcomingBreak) {
          const bStart = this.timeToMinutes(upcomingBreak.startTime);
          const bEnd = this.timeToMinutes(upcomingBreak.endTime);

          slots.push({
            day,
            periodIndex: currentPeriodIndex,
            startTime: this.minutesToTime(bStart),
            endTime: this.minutesToTime(bEnd),
            isBreak: true,
            breakName: upcomingBreak.name,
          });

          currentTimeMins = Math.max(currentTimeMins + 1, bEnd);
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
   * Utilizes heuristic ordering (Double lessons first, then Highest Constrained Teachers)
   * and a 1-step ejection/swap algorithm to eliminate unnecessary free periods for students.
   */
  static generate(params: {
    periodsGrid: Map<string, DayPeriodSlot[]>;
    allocations: ClassSubjectTeacherItem[];
    coCurriculars?: TimetableCoCurricular[];
    teacherConstraints?: TimetableTeacherConstraints;
  }): GenerationResult {
    const { periodsGrid, allocations, coCurriculars, teacherConstraints } = params;

    const resultSlots: GeneratedSlot[] = [];
    const unplacedLessons: GenerationReportItem[] = [];

    // Tracks: (day, periodIndex, teacherId) -> boolean
    const teacherOccupied = new Set<string>();
    // Tracks: (day, periodIndex, classId) -> boolean
    const classOccupied = new Set<string>();
    // Tracks: (classId, subjectId, day) -> count of lessons
    const classSubjectDayCount = new Map<string, number>();
    // Maps: (day, periodIndex, classId) -> index in resultSlots
    const classSlotMap = new Map<string, number>();

    // 1. Mark co-curricular fixed slots as occupied for designated classes
    if (coCurriculars) {
      for (const cc of coCurriculars) {
        for (const clsId of cc.classIds) {
          classOccupied.add(`${cc.day}_${cc.periodIndex}_${clsId}`);
        }
      }
    }

    interface SchedulingTask {
      item: ClassSubjectTeacherItem;
      isDouble: boolean;
    }

    const tasks: SchedulingTask[] = [];
    const teacherAssignedLessons = new Map<string, number>();
    let totalRequiredLessons = 0;

    // Calculate teacher total workload across all allocated classes (to prioritize high-demand teachers)
    const teacherTotalWorkload = new Map<string, number>();
    for (const alloc of allocations) {
      teacherTotalWorkload.set(
        alloc.teacherId,
        (teacherTotalWorkload.get(alloc.teacherId) || 0) + alloc.lessonsPerWeek
      );
    }

    for (const alloc of allocations) {
      let remainingLessons = alloc.lessonsPerWeek;
      totalRequiredLessons += alloc.lessonsPerWeek;
      const doubleCount = alloc.doubleLessonsCount || 0;

      // Administrative & Special Staff workload cap enforcement
      const staffCap = teacherConstraints?.specialStaffLimits?.[alloc.teacherId];
      if (staffCap !== undefined && staffCap >= 0) {
        const alreadyScheduled = teacherAssignedLessons.get(alloc.teacherId) || 0;
        if (alreadyScheduled >= staffCap) {
          const dropped = remainingLessons;
          remainingLessons = 0;
          if (dropped > 0) {
            unplacedLessons.push({
              className: alloc.className,
              subjectName: alloc.subjectName,
              teacherName: alloc.teacherName,
              reason: `Staff workload limit reached (${staffCap} weekly lessons maximum configured for ${alloc.teacherName})`,
            });
          }
        } else if (alreadyScheduled + remainingLessons > staffCap) {
          const allowed = Math.max(0, staffCap - alreadyScheduled);
          const dropped = remainingLessons - allowed;
          remainingLessons = allowed;
          if (dropped > 0) {
            unplacedLessons.push({
              className: alloc.className,
              subjectName: alloc.subjectName,
              teacherName: alloc.teacherName,
              reason: `Staff workload limit reached (${staffCap} weekly lessons maximum configured for ${alloc.teacherName})`,
            });
          }
        }
      }

      // Add double periods
      for (let i = 0; i < doubleCount && remainingLessons >= 2; i++) {
        tasks.push({ item: alloc, isDouble: true });
        remainingLessons -= 2;
        teacherAssignedLessons.set(
          alloc.teacherId,
          (teacherAssignedLessons.get(alloc.teacherId) || 0) + 2
        );
      }

      // Add single periods
      for (let i = 0; i < remainingLessons; i++) {
        tasks.push({ item: alloc, isDouble: false });
        teacherAssignedLessons.set(
          alloc.teacherId,
          (teacherAssignedLessons.get(alloc.teacherId) || 0) + 1
        );
      }
    }

    // Heuristic task ordering (Most Constrained First):
    // 1. Double lessons first (hardest to fit)
    // 2. Teachers with highest overall school-wide workload (multi-grade specialist teachers)
    // 3. Highest lessons per week
    tasks.sort((a, b) => {
      if (a.isDouble && !b.isDouble) return -1;
      if (!a.isDouble && b.isDouble) return 1;

      const workloadA = teacherTotalWorkload.get(a.item.teacherId) || 0;
      const workloadB = teacherTotalWorkload.get(b.item.teacherId) || 0;
      if (workloadB !== workloadA) return workloadB - workloadA;

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

      // Pass 1: Strict day spreading (1 lesson per subject per day)
      // Pass 2: Flexible day spreading (allow second lesson on same day if needed)
      for (const allowMultipleOnSameDay of [false, true]) {
        if (scheduled) break;

        for (const day of candidateDays) {
          if (scheduled) break;

          const daySlots = periodsGrid.get(day) || [];
          const teachingSlots = daySlots.filter((s) => !s.isBreak);

          const existingOnDay =
            classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${day}`) || 0;
          if (!allowMultipleOnSameDay && existingOnDay > 0) {
            continue; // Try strict day spreading first
          }

          if (isDouble) {
            for (let i = 0; i < teachingSlots.length - 1; i++) {
              const slot1 = teachingSlots[i];
              const slot2 = teachingSlots[i + 1];

              if (slot2.periodIndex !== slot1.periodIndex + 1) continue;

              const classBusy1 = classOccupied.has(`${day}_${slot1.periodIndex}_${item.classId}`);
              const classBusy2 = classOccupied.has(`${day}_${slot2.periodIndex}_${item.classId}`);
              const teacherBusy1 = teacherOccupied.has(`${day}_${slot1.periodIndex}_${item.teacherId}`);
              const teacherBusy2 = teacherOccupied.has(`${day}_${slot2.periodIndex}_${item.teacherId}`);

              if (!classBusy1 && !classBusy2 && !teacherBusy1 && !teacherBusy2) {
                classOccupied.add(`${day}_${slot1.periodIndex}_${item.classId}`);
                classOccupied.add(`${day}_${slot2.periodIndex}_${item.classId}`);
                teacherOccupied.add(`${day}_${slot1.periodIndex}_${item.teacherId}`);
                teacherOccupied.add(`${day}_${slot2.periodIndex}_${item.teacherId}`);

                const idx1 = resultSlots.length;
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

                const idx2 = resultSlots.length;
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

                classSlotMap.set(`${day}_${slot1.periodIndex}_${item.classId}`, idx1);
                classSlotMap.set(`${day}_${slot2.periodIndex}_${item.classId}`, idx2);

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

                const slotIdx = resultSlots.length;
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

                classSlotMap.set(`${day}_${slot.periodIndex}_${item.classId}`, slotIdx);

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

      // Pass 3: 1-Step Ejection / Swap for Single Lessons
      // If our teacher is free at (day, period) but the class has another lesson, see if that other lesson can be moved to an open slot
      if (!scheduled && !isDouble) {
        for (const day of schoolDays) {
          if (scheduled) break;
          const daySlots = periodsGrid.get(day) || [];
          const teachingSlots = daySlots.filter((s) => !s.isBreak);

          for (const s of teachingSlots) {
            if (scheduled) break;
            const teacherBusy = teacherOccupied.has(`${day}_${s.periodIndex}_${item.teacherId}`);
            if (teacherBusy) continue; // Our teacher must be free in this slot

            const occupantIdx = classSlotMap.get(`${day}_${s.periodIndex}_${item.classId}`);
            if (occupantIdx === undefined) continue;
            const occupant = resultSlots[occupantIdx];
            if (!occupant || occupant.isDoubleLesson) continue; // Don't break double lessons

            // Try to move occupant to another day/period where both class & occupant teacher are free
            for (const altDay of schoolDays) {
              if (scheduled) break;
              const altDaySlots = (periodsGrid.get(altDay) || []).filter((sl) => !sl.isBreak);

              for (const altS of altDaySlots) {
                if (altDay === day && altS.periodIndex === s.periodIndex) continue;

                const altClassBusy = classOccupied.has(`${altDay}_${altS.periodIndex}_${item.classId}`);
                const altTeacherBusy = teacherOccupied.has(`${altDay}_${altS.periodIndex}_${occupant.teacherId}`);

                if (!altClassBusy && !altTeacherBusy) {
                  // Relocate occupant to alt slot
                  classOccupied.delete(`${day}_${s.periodIndex}_${item.classId}`);
                  teacherOccupied.delete(`${day}_${s.periodIndex}_${occupant.teacherId}`);

                  classOccupied.add(`${altDay}_${altS.periodIndex}_${item.classId}`);
                  teacherOccupied.add(`${altDay}_${altS.periodIndex}_${occupant.teacherId}`);

                  occupant.dayOfWeek = altDay;
                  occupant.periodIndex = altS.periodIndex;
                  occupant.startTime = altS.startTime;
                  occupant.endTime = altS.endTime;

                  classSlotMap.delete(`${day}_${s.periodIndex}_${item.classId}`);
                  classSlotMap.set(`${altDay}_${altS.periodIndex}_${item.classId}`, occupantIdx);

                  // Place our task in the vacated slot
                  classOccupied.add(`${day}_${s.periodIndex}_${item.classId}`);
                  teacherOccupied.add(`${day}_${s.periodIndex}_${item.teacherId}`);

                  const newSlotIdx = resultSlots.length;
                  resultSlots.push({
                    classId: item.classId,
                    subjectId: item.subjectId,
                    teacherId: item.teacherId,
                    dayOfWeek: day,
                    periodIndex: s.periodIndex,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    isDoubleLesson: false,
                  });

                  classSlotMap.set(`${day}_${s.periodIndex}_${item.classId}`, newSlotIdx);
                  scheduled = true;
                  break;
                }
              }
            }
          }
        }
      }

      if (!scheduled) {
        unplacedLessons.push({
          className: item.className,
          subjectName: item.subjectName,
          teacherName: item.teacherName,
          reason: `Schedule clash: all available teaching periods for ${item.className} overlap with ${item.teacherName}'s schedule in other grades`,
        });
      }
    }

    return {
      slots: resultSlots,
      totalRequiredLessons,
      totalPlacedLessons: resultSlots.length,
      unplacedLessons,
    };
  }
}
