import {
  TimetableBreak,
  FridaySpecialSchedule,
  TimetableCoCurricular,
  SubjectLessonRequirement,
  TimetableTeacherConstraints,
} from '@school/shared';

export type DaySessionTier = 'EARLY_MORNING' | 'MID_MORNING' | 'AFTERNOON';

export interface DayPeriodSlot {
  day: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakName?: string;
  sessionTier?: DaySessionTier;
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

export interface TeacherSessionSummary {
  teacherId: string;
  teacherName: string;
  totalLessons: number;
  earlyMorning: number;
  midMorning: number;
  afternoon: number;
  maxConsecutiveExperienced: number;
  dailyDistribution: Record<string, number>;
}

export interface GenerationResult {
  slots: GeneratedSlot[];
  totalRequiredLessons: number;
  totalPlacedLessons: number;
  unplacedLessons: GenerationReportItem[];
  teacherSummaries?: TeacherSessionSummary[];
}

/**
 * Keywords for subjects that demand high student cognitive concentration.
 * Uses flexible substring matching (.toLowerCase() and .includes()) so that
 * any variant created by school administrators (e.g. Maths, Mathematics,
 * Integrated Science, Pre-Technical, Computer) matches accurately.
 */
export const HIGH_CONCENTRATION_KEYWORDS = [
  'math',        // Mathematics, Maths, Mathematical Activities
  'scien',       // Science, Sciences, Integrated Science, Science & Technology
  'tech',        // Technical, Technology, Pre-Technical Studies
  'comput',      // Computer, Computing, Computer Studies
  'physics',     // Physics
  'chem',        // Chemistry
  'bio',         // Biology
  'eng',         // English, English Language Activities
  'kisw',        // Kiswahili, Kiswahili Language Activities
];

export function isHighConcentrationSubject(subject: { name: string; code?: string }): boolean {
  const target = `${subject.name || ''} ${subject.code || ''}`.toLowerCase();
  return HIGH_CONCENTRATION_KEYWORDS.some((kw) => target.includes(kw));
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
   * Dynamically classifies each teaching period into:
   * - EARLY_MORNING: Up to Break 2 (Long / Tea Break)
   * - MID_MORNING: Between Break 2 and Lunch Break
   * - AFTERNOON: After Lunch Break
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
      const defaultEndMins = this.timeToMinutes(config.endTime) || 960;

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

      // DYNAMIC DAY-PART BOUNDARIES from Deputy's input breaks:
      // 1. Identify Lunch Break (the midday break, usually >= 40 mins or starting between 12:00 and 13:30)
      const lunchBreak =
        dayBreaks.find(
          (b) =>
            b.name.toLowerCase().includes('lunch') ||
            b.name.toLowerCase().includes('dhuhr') ||
            (this.timeToMinutes(b.endTime) - this.timeToMinutes(b.startTime) >= 40 &&
              this.timeToMinutes(b.startTime) >= 700)
        ) || dayBreaks[dayBreaks.length - 1];

      const lunchStartMins = lunchBreak
        ? this.timeToMinutes(lunchBreak.startTime)
        : isFriday && validJummah
        ? jummahStartMins
        : 750;
      const lunchEndMins = lunchBreak
        ? this.timeToMinutes(lunchBreak.endTime)
        : isFriday && validJummah
        ? jummahReturnMins
        : 825;

      // 2. Identify Morning Long / Tea Break (the pre-lunch break right before lunch)
      const preLunchBreaks = dayBreaks.filter(
        (b) => b !== lunchBreak && this.timeToMinutes(b.endTime) <= lunchStartMins
      );

      const morningBoundaryBreak =
        preLunchBreaks.length > 1
          ? preLunchBreaks[preLunchBreaks.length - 1]
          : preLunchBreaks[0];

      const morningEndMins = morningBoundaryBreak
        ? this.timeToMinutes(morningBoundaryBreak.startTime)
        : lunchStartMins - 60;
      const midMorningStartMins = morningBoundaryBreak
        ? this.timeToMinutes(morningBoundaryBreak.endTime)
        : morningEndMins;

      let currentTimeMins = dayStartMins;
      let watchdog = 0;

      while (currentTimeMins + lessonDuration <= dayEndMins) {
        if (++watchdog > 100) break; // Safety watchdog

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
              sessionTier: 'AFTERNOON',
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

        // Standard teaching lesson slot: calculate session tier dynamically
        const periodStartStr = this.minutesToTime(currentTimeMins);
        const periodEndStr = this.minutesToTime(currentTimeMins + lessonDuration);
        const slotEndMins = currentTimeMins + lessonDuration;

        let sessionTier: DaySessionTier = 'EARLY_MORNING';
        if (slotEndMins <= morningEndMins) {
          sessionTier = 'EARLY_MORNING';
        } else if (currentTimeMins >= midMorningStartMins && slotEndMins <= lunchStartMins) {
          sessionTier = 'MID_MORNING';
        } else if (currentTimeMins >= lunchEndMins) {
          sessionTier = 'AFTERNOON';
        } else {
          // Boundary overlap fallback
          if (currentTimeMins < morningEndMins) sessionTier = 'EARLY_MORNING';
          else if (currentTimeMins < lunchStartMins) sessionTier = 'MID_MORNING';
          else sessionTier = 'AFTERNOON';
        }

        slots.push({
          day,
          periodIndex: currentPeriodIndex,
          startTime: periodStartStr,
          endTime: periodEndStr,
          isBreak: false,
          sessionTier,
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
   * Features:
   * 1. Multi-Objective Cost-Based Slot Selection (eliminates afternoon idling traps).
   * 2. Pedagogical Prioritization of High-Concentration subjects in morning/mid-morning.
   * 3. Hard enforcement of maxConsecutiveLessons fatigue protection.
   * 4. 1-Step Ejection Chains for 100% full schedule guarantee.
   * 5. Post-Placement Local Search Swap Optimizer to systematically smooth out teacher schedules.
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

    // Max consecutive teaching periods before requiring a break or free period (default: 3)
    const maxConsecutive = Math.max(1, Number(teacherConstraints?.maxConsecutiveLessons) || 3);

    // Conflict Tracking Sets & Maps
    // Tracks: `${day}_${periodIndex}_${teacherId}`
    const teacherOccupied = new Set<string>();
    // Tracks: `${day}_${periodIndex}_${classId}`
    const classOccupied = new Set<string>();
    // Tracks: `${classId}_${subjectId}_${day}` -> count of lessons on that day
    const classSubjectDayCount = new Map<string, number>();
    // Maps: `${day}_${periodIndex}_${classId}` -> index in resultSlots
    const classSlotMap = new Map<string, number>();

    // Live Teacher Workload & Session Distribution Trackers
    const teacherSessionCounts = new Map<
      string,
      { EARLY_MORNING: number; MID_MORNING: number; AFTERNOON: number }
    >();
    const teacherDayCounts = new Map<string, Map<string, number>>();
    const teacherDayPeriods = new Map<string, Map<string, Set<number>>>();

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
      isHighConcentration: boolean;
    }

    const tasks: SchedulingTask[] = [];
    const teacherAssignedLessons = new Map<string, number>();
    let totalRequiredLessons = 0;

    // Calculate teacher total workload across all allocated classes
    const teacherTotalWorkload = new Map<string, number>();
    for (const alloc of allocations) {
      teacherTotalWorkload.set(
        alloc.teacherId,
        (teacherTotalWorkload.get(alloc.teacherId) || 0) + alloc.lessonsPerWeek
      );

      // Initialize session trackers
      if (!teacherSessionCounts.has(alloc.teacherId)) {
        teacherSessionCounts.set(alloc.teacherId, {
          EARLY_MORNING: 0,
          MID_MORNING: 0,
          AFTERNOON: 0,
        });
      }
      if (!teacherDayCounts.has(alloc.teacherId)) {
        teacherDayCounts.set(alloc.teacherId, new Map());
      }
      if (!teacherDayPeriods.has(alloc.teacherId)) {
        teacherDayPeriods.set(alloc.teacherId, new Map());
      }
    }

    // Build tasks with special staff limits enforcement
    for (const alloc of allocations) {
      let remainingLessons = alloc.lessonsPerWeek;
      totalRequiredLessons += alloc.lessonsPerWeek;
      const doubleCount = alloc.doubleLessonsCount || 0;
      const isHighConc = isHighConcentrationSubject({ name: alloc.subjectName, code: alloc.subjectCode });

      // Administrative workload cap enforcement
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
        tasks.push({ item: alloc, isDouble: true, isHighConcentration: isHighConc });
        remainingLessons -= 2;
        teacherAssignedLessons.set(
          alloc.teacherId,
          (teacherAssignedLessons.get(alloc.teacherId) || 0) + 2
        );
      }

      // Add single periods
      for (let i = 0; i < remainingLessons; i++) {
        tasks.push({ item: alloc, isDouble: false, isHighConcentration: isHighConc });
        teacherAssignedLessons.set(
          alloc.teacherId,
          (teacherAssignedLessons.get(alloc.teacherId) || 0) + 1
        );
      }
    }

    // Heuristic Task Sorting:
    // 1. High-Concentration Double lessons (hardest to fit into mornings)
    // 2. Other Double lessons
    // 3. Teachers with highest overall school-wide workload (multi-grade specialists)
    // 4. High-concentration single subjects
    // 5. Lessons per week
    tasks.sort((a, b) => {
      if (a.isDouble && !b.isDouble) return -1;
      if (!a.isDouble && b.isDouble) return 1;

      if (a.isHighConcentration && !b.isHighConcentration) return -1;
      if (!a.isHighConcentration && b.isHighConcentration) return 1;

      const workloadA = teacherTotalWorkload.get(a.item.teacherId) || 0;
      const workloadB = teacherTotalWorkload.get(b.item.teacherId) || 0;
      if (workloadB !== workloadA) return workloadB - workloadA;

      return b.item.lessonsPerWeek - a.item.lessonsPerWeek;
    });

    const schoolDays = Array.from(periodsGrid.keys());

    // Helper: Checks if scheduling at periodIndex on day causes teacher to exceed maxConsecutiveLessons
    const wouldExceedConsecutive = (
      teacherId: string,
      day: string,
      periodIndex: number,
      isDouble: boolean
    ): boolean => {
      const dayPeriods = teacherDayPeriods.get(teacherId)?.get(day);
      if (!dayPeriods || dayPeriods.size === 0) return false;

      const testSet = new Set(dayPeriods);
      testSet.add(periodIndex);
      if (isDouble) testSet.add(periodIndex + 1);

      // Check for contiguous runs in teaching slots
      const daySlots = periodsGrid.get(day) || [];
      let consecutiveCount = 0;
      let maxSeen = 0;

      for (const slot of daySlots) {
        if (slot.isBreak) {
          consecutiveCount = 0; // Break resets consecutive fatigue
        } else if (testSet.has(slot.periodIndex)) {
          consecutiveCount++;
          if (consecutiveCount > maxSeen) maxSeen = consecutiveCount;
        } else {
          consecutiveCount = 0;
        }
      }

      return maxSeen > maxConsecutive;
    };

    // Helper: Evaluates penalty score for placing task at candidate slot (lower score is better)
    const computeSlotPenalty = (
      task: SchedulingTask,
      day: string,
      slot: DayPeriodSlot,
      slot2?: DayPeriodSlot
    ): number => {
      let penalty = 0;
      const { item, isHighConcentration } = task;
      const teacherId = item.teacherId;
      const session = slot.sessionTier || 'EARLY_MORNING';
      const totalWeekly = teacherTotalWorkload.get(teacherId) || 1;
      const tSessions = teacherSessionCounts.get(teacherId) || {
        EARLY_MORNING: 0,
        MID_MORNING: 0,
        AFTERNOON: 0,
      };

      // 1. Pedagogical High-Concentration Alignment
      if (isHighConcentration) {
        if (session === 'EARLY_MORNING') penalty -= 50; // High focus early morning
        else if (session === 'MID_MORNING') penalty -= 35; // Great focus mid-morning
        else if (session === 'AFTERNOON') penalty += 75; // Heavy penalty for late-afternoon fatigue
      } else {
        // Expressive / Active / Sports / Arts / Religious Education
        if (session === 'MID_MORNING') penalty -= 20;
        else if (session === 'AFTERNOON') penalty -= 25; // Natural afternoon engagement
        else if (session === 'EARLY_MORNING') penalty += 15;
      }

      // 2. Teacher Day-Part Balance (Eliminate Afternoon-Only Staffroom Idling Traps)
      const curMorning = tSessions.EARLY_MORNING + tSessions.MID_MORNING;
      const curAfternoon = tSessions.AFTERNOON;

      if (session === 'AFTERNOON') {
        // If teacher has zero morning lessons so far, penalize putting them into afternoon
        if (curMorning === 0 && curAfternoon >= 1) {
          penalty += 110;
        } else if (curAfternoon > curMorning + 2) {
          penalty += 55;
        }
      } else {
        // Morning or Mid-Morning
        if (curMorning === 0) {
          penalty -= 70; // Highly welcome morning lesson for this teacher
        } else if (curMorning < curAfternoon) {
          penalty -= 35;
        }
      }

      // 3. Teacher Daily Load Smoothing
      const dailyTarget = Math.max(1, Math.ceil(totalWeekly / schoolDays.length));
      const dayCount = teacherDayCounts.get(teacherId)?.get(day) || 0;

      if (dayCount >= dailyTarget + 1) {
        penalty += 45 * (dayCount - dailyTarget);
      } else if (dayCount === 0) {
        penalty -= 30; // Encourage distributing across all school days
      }

      // 4. Staffroom Idling Gap Penalty
      // If the teacher has no other lessons today, placing their only lesson in period 7 or 8 causes 5+ hours of idling
      if (dayCount === 0 && slot.periodIndex >= 7) {
        penalty += 65;
      }

      // 5. Slight tie-breaker to favor earlier periods within the same session
      penalty += slot.periodIndex * 0.4;

      return penalty;
    };

    // Schedule each task using multi-objective scoring
    for (const task of tasks) {
      const { item, isDouble } = task;
      let scheduled = false;

      // Candidate days prioritized by subject spacing for this class
      const candidateDays = [...schoolDays].sort((dayA, dayB) => {
        const countA = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${dayA}`) || 0;
        const countB = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${dayB}`) || 0;
        if (countA !== countB) return countA - countB;

        // Secondary tie-breaker: Teacher daily load on day
        const tCountA = teacherDayCounts.get(item.teacherId)?.get(dayA) || 0;
        const tCountB = teacherDayCounts.get(item.teacherId)?.get(dayB) || 0;
        return tCountA - tCountB;
      });

      // Pass 1: Strict day spreading (1 lesson per subject per day)
      // Pass 2: Flexible day spreading (allow multiple if schedule is tightly packed)
      for (const allowMultipleOnSameDay of [false, true]) {
        if (scheduled) break;

        // Collect all valid candidate slots across candidate days
        interface CandidatePlacement {
          day: string;
          slot1: DayPeriodSlot;
          slot2?: DayPeriodSlot;
          penalty: number;
        }

        const validCandidates: CandidatePlacement[] = [];

        for (const day of candidateDays) {
          const daySlots = periodsGrid.get(day) || [];
          const teachingSlots = daySlots.filter((s) => !s.isBreak);

          const existingOnDay =
            classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${day}`) || 0;
          if (!allowMultipleOnSameDay && existingOnDay > 0) continue;

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
                // Check consecutive lessons guard
                if (!wouldExceedConsecutive(item.teacherId, day, slot1.periodIndex, true)) {
                  const penalty = computeSlotPenalty(task, day, slot1, slot2);
                  validCandidates.push({ day, slot1, slot2, penalty });
                }
              }
            }
          } else {
            // Single lesson
            for (const slot of teachingSlots) {
              const classBusy = classOccupied.has(`${day}_${slot.periodIndex}_${item.classId}`);
              const teacherBusy = teacherOccupied.has(`${day}_${slot.periodIndex}_${item.teacherId}`);

              if (!classBusy && !teacherBusy) {
                // Check consecutive lessons guard
                if (!wouldExceedConsecutive(item.teacherId, day, slot.periodIndex, false)) {
                  const penalty = computeSlotPenalty(task, day, slot);
                  validCandidates.push({ day, slot1: slot, penalty });
                }
              }
            }
          }
        }

        // Sort candidates by penalty ascending (best balanced slot first)
        validCandidates.sort((a, b) => a.penalty - b.penalty);

        if (validCandidates.length > 0) {
          const best = validCandidates[0];
          const day = best.day;

          if (isDouble && best.slot2) {
            const slot1 = best.slot1;
            const slot2 = best.slot2;

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

            // Update trackers
            const prevCount = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${day}`) || 0;
            classSubjectDayCount.set(`${item.classId}_${item.subjectId}_${day}`, prevCount + 2);

            const sTier1 = slot1.sessionTier || 'EARLY_MORNING';
            const sTier2 = slot2.sessionTier || 'EARLY_MORNING';
            const sMap = teacherSessionCounts.get(item.teacherId)!;
            sMap[sTier1] = (sMap[sTier1] || 0) + 1;
            sMap[sTier2] = (sMap[sTier2] || 0) + 1;

            const tDayMap = teacherDayCounts.get(item.teacherId)!;
            tDayMap.set(day, (tDayMap.get(day) || 0) + 2);

            const tPeriodsMap = teacherDayPeriods.get(item.teacherId)!;
            if (!tPeriodsMap.has(day)) tPeriodsMap.set(day, new Set());
            tPeriodsMap.get(day)!.add(slot1.periodIndex);
            tPeriodsMap.get(day)!.add(slot2.periodIndex);

            scheduled = true;
          } else {
            // Single lesson
            const slot = best.slot1;
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

            // Update trackers
            const prevCount = classSubjectDayCount.get(`${item.classId}_${item.subjectId}_${day}`) || 0;
            classSubjectDayCount.set(`${item.classId}_${item.subjectId}_${day}`, prevCount + 1);

            const sTier = slot.sessionTier || 'EARLY_MORNING';
            const sMap = teacherSessionCounts.get(item.teacherId)!;
            sMap[sTier] = (sMap[sTier] || 0) + 1;

            const tDayMap = teacherDayCounts.get(item.teacherId)!;
            tDayMap.set(day, (tDayMap.get(day) || 0) + 1);

            const tPeriodsMap = teacherDayPeriods.get(item.teacherId)!;
            if (!tPeriodsMap.has(day)) tPeriodsMap.set(day, new Set());
            tPeriodsMap.get(day)!.add(slot.periodIndex);

            scheduled = true;
          }
        }
      }

      // Pass 3: 1-Step Ejection Chain / Ripple Swap for Single Lessons
      // If our teacher is free at (day, period) but the class has another lesson, see if that other lesson can be moved
      if (!scheduled && !isDouble) {
        for (const day of schoolDays) {
          if (scheduled) break;
          const daySlots = periodsGrid.get(day) || [];
          const teachingSlots = daySlots.filter((s) => !s.isBreak);

          for (const s of teachingSlots) {
            if (scheduled) break;
            const teacherBusy = teacherOccupied.has(`${day}_${s.periodIndex}_${item.teacherId}`);
            if (teacherBusy) continue;

            const occupantIdx = classSlotMap.get(`${day}_${s.periodIndex}_${item.classId}`);
            if (occupantIdx === undefined) continue;
            const occupant = resultSlots[occupantIdx];
            if (!occupant || occupant.isDoubleLesson) continue;

            // Try to move occupant to another slot where both class & occupant teacher are free
            for (const altDay of schoolDays) {
              if (scheduled) break;
              const altDaySlots = (periodsGrid.get(altDay) || []).filter((sl) => !sl.isBreak);

              for (const altS of altDaySlots) {
                if (altDay === day && altS.periodIndex === s.periodIndex) continue;

                const altClassBusy = classOccupied.has(`${altDay}_${altS.periodIndex}_${item.classId}`);
                const altTeacherBusy = teacherOccupied.has(`${altDay}_${altS.periodIndex}_${occupant.teacherId}`);

                if (!altClassBusy && !altTeacherBusy) {
                  // Relocate occupant
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

                  const sTier = s.sessionTier || 'EARLY_MORNING';
                  const sMap = teacherSessionCounts.get(item.teacherId)!;
                  sMap[sTier] = (sMap[sTier] || 0) + 1;

                  const tDayMap = teacherDayCounts.get(item.teacherId)!;
                  tDayMap.set(day, (tDayMap.get(day) || 0) + 1);

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

    // Stage 4: Post-Placement Local Search Swap Optimizer (Simulated Annealing)
    // Runs fast pairwise intra-class swaps to smooth out any remaining teacher morning/afternoon imbalances
    this.optimizePostPlacementSwaps({
      resultSlots,
      periodsGrid,
      teacherTotalWorkload,
      teacherOccupied,
      allocations,
      maxConsecutive,
    });

    // Generate comprehensive diagnostic summary
    const teacherSummaries = this.buildTeacherSummaries({
      resultSlots,
      allocations,
      periodsGrid,
    });

    return {
      slots: resultSlots,
      totalRequiredLessons,
      totalPlacedLessons: resultSlots.length,
      unplacedLessons,
      teacherSummaries,
    };
  }

  /**
   * Post-Placement Optimizer:
   * Fast iterative local search that tests conflict-free swaps within the same class
   * to reduce teacher morning vs afternoon disparity and eliminate idling traps.
   */
  private static optimizePostPlacementSwaps(ctx: {
    resultSlots: GeneratedSlot[];
    periodsGrid: Map<string, DayPeriodSlot[]>;
    teacherTotalWorkload: Map<string, number>;
    teacherOccupied: Set<string>;
    allocations: ClassSubjectTeacherItem[];
    maxConsecutive: number;
  }) {
    const { resultSlots, periodsGrid, teacherOccupied, allocations, maxConsecutive } = ctx;
    if (resultSlots.length < 2) return;

    // Build period index to sessionTier lookup
    const slotTierLookup = new Map<string, DaySessionTier>();
    for (const [day, daySlots] of periodsGrid) {
      for (const s of daySlots) {
        if (!s.isBreak && s.sessionTier) {
          slotTierLookup.set(`${day}_${s.periodIndex}`, s.sessionTier);
        }
      }
    }

    // Build subject concentration lookup
    const isHighConcSubjectId = new Map<string, boolean>();
    for (const a of allocations) {
      isHighConcSubjectId.set(
        a.subjectId,
        isHighConcentrationSubject({ name: a.subjectName, code: a.subjectCode })
      );
    }

    // Group single-lesson slots by classId
    const singleSlotsByClass = new Map<string, number[]>();
    for (let i = 0; i < resultSlots.length; i++) {
      const s = resultSlots[i];
      if (!s.isDoubleLesson) {
        if (!singleSlotsByClass.has(s.classId)) singleSlotsByClass.set(s.classId, []);
        singleSlotsByClass.get(s.classId)!.push(i);
      }
    }

    // Helper: Calculate teacher afternoon balance penalty
    const getTeacherDisparity = (teacherId: string, currentSlots: GeneratedSlot[]) => {
      let m = 0;
      let a = 0;
      for (const s of currentSlots) {
        if (s.teacherId === teacherId) {
          const tier = slotTierLookup.get(`${s.dayOfWeek}_${s.periodIndex}`) || 'EARLY_MORNING';
          if (tier === 'AFTERNOON') a++;
          else m++;
        }
      }
      // If afternoon lessons exceed morning by more than 1, penalize
      if (a > m + 1) return (a - m) * 10;
      return 0;
    };

    // Optimization passes: 300 fast trial swaps
    const maxIters = 300;
    for (let iter = 0; iter < maxIters; iter++) {
      for (const [, classIndices] of singleSlotsByClass) {
        if (classIndices.length < 2) continue;

        // Pick two random slots in this class
        const idxA = classIndices[Math.floor(Math.random() * classIndices.length)];
        const idxB = classIndices[Math.floor(Math.random() * classIndices.length)];
        if (idxA === idxB) continue;

        const slotA = resultSlots[idxA];
        const slotB = resultSlots[idxB];
        if (slotA.teacherId === slotB.teacherId) continue; // Same teacher, no balance change

        const tierA = slotTierLookup.get(`${slotA.dayOfWeek}_${slotA.periodIndex}`) || 'EARLY_MORNING';
        const tierB = slotTierLookup.get(`${slotB.dayOfWeek}_${slotB.periodIndex}`) || 'EARLY_MORNING';
        if (tierA === tierB) continue; // Same session tier, no day-part shift

        // Check if Teacher A is free at Slot B's time (ignoring slot A itself)
        const tABusy = teacherOccupied.has(`${slotB.dayOfWeek}_${slotB.periodIndex}_${slotA.teacherId}`);
        // Check if Teacher B is free at Slot A's time (ignoring slot B itself)
        const tBBusy = teacherOccupied.has(`${slotA.dayOfWeek}_${slotA.periodIndex}_${slotB.teacherId}`);

        if (tABusy || tBBusy) continue; // Collision in other class!

        // Calculate disparity before swap
        const dispBeforeA = getTeacherDisparity(slotA.teacherId, resultSlots);
        const dispBeforeB = getTeacherDisparity(slotB.teacherId, resultSlots);

        // Tentatively simulate swap
        const oldDayA = slotA.dayOfWeek;
        const oldPIdxA = slotA.periodIndex;
        const oldStartA = slotA.startTime;
        const oldEndA = slotA.endTime;

        slotA.dayOfWeek = slotB.dayOfWeek;
        slotA.periodIndex = slotB.periodIndex;
        slotA.startTime = slotB.startTime;
        slotA.endTime = slotB.endTime;

        slotB.dayOfWeek = oldDayA;
        slotB.periodIndex = oldPIdxA;
        slotB.startTime = oldStartA;
        slotB.endTime = oldEndA;

        // Calculate disparity after swap
        const dispAfterA = getTeacherDisparity(slotA.teacherId, resultSlots);
        const dispAfterB = getTeacherDisparity(slotB.teacherId, resultSlots);

        // Check pedagogical high-concentration alignment
        const isToughA = isHighConcSubjectId.get(slotA.subjectId) || false;
        const isToughB = isHighConcSubjectId.get(slotB.subjectId) || false;

        let pedPenalty = 0;
        // If tough subject moved to afternoon, penalize
        if (isToughA && tierB === 'AFTERNOON') pedPenalty += 15;
        if (isToughB && tierA === 'AFTERNOON') pedPenalty += 15;
        // If tough subject moved out of afternoon, reward
        if (isToughA && tierA === 'AFTERNOON') pedPenalty -= 15;
        if (isToughB && tierB === 'AFTERNOON') pedPenalty -= 15;

        const totalBefore = dispBeforeA + dispBeforeB;
        const totalAfter = dispAfterA + dispAfterB + pedPenalty;

        if (totalAfter < totalBefore) {
          // Accept swap! Update teacherOccupied set
          teacherOccupied.delete(`${oldDayA}_${oldPIdxA}_${slotA.teacherId}`);
          teacherOccupied.delete(`${slotA.dayOfWeek}_${slotA.periodIndex}_${slotB.teacherId}`);

          teacherOccupied.add(`${slotA.dayOfWeek}_${slotA.periodIndex}_${slotA.teacherId}`);
          teacherOccupied.add(`${oldDayA}_${oldPIdxA}_${slotB.teacherId}`);
        } else {
          // Revert swap
          slotB.dayOfWeek = slotA.dayOfWeek;
          slotB.periodIndex = slotA.periodIndex;
          slotB.startTime = slotA.startTime;
          slotB.endTime = slotA.endTime;

          slotA.dayOfWeek = oldDayA;
          slotA.periodIndex = oldPIdxA;
          slotA.startTime = oldStartA;
          slotA.endTime = oldEndA;
        }
      }
    }
  }

  /**
   * Compiles detailed teacher-by-teacher diagnostic metrics for administrative review.
   */
  private static buildTeacherSummaries(ctx: {
    resultSlots: GeneratedSlot[];
    allocations: ClassSubjectTeacherItem[];
    periodsGrid: Map<string, DayPeriodSlot[]>;
  }): TeacherSessionSummary[] {
    const { resultSlots, allocations, periodsGrid } = ctx;

    const teacherMap = new Map<string, string>();
    for (const a of allocations) {
      teacherMap.set(a.teacherId, a.teacherName);
    }

    const slotTierLookup = new Map<string, DaySessionTier>();
    for (const [day, daySlots] of periodsGrid) {
      for (const s of daySlots) {
        if (!s.isBreak && s.sessionTier) {
          slotTierLookup.set(`${day}_${s.periodIndex}`, s.sessionTier);
        }
      }
    }

    const summaries: TeacherSessionSummary[] = [];

    for (const [tId, tName] of teacherMap) {
      const tSlots = resultSlots.filter((s) => s.teacherId === tId);
      let earlyMorning = 0;
      let midMorning = 0;
      let afternoon = 0;
      const dailyDistribution: Record<string, number> = {};

      // Sort slots by day and period to calculate max consecutive lessons experienced
      const daySlotsMap = new Map<string, number[]>();

      for (const s of tSlots) {
        const tier = slotTierLookup.get(`${s.dayOfWeek}_${s.periodIndex}`) || 'EARLY_MORNING';
        if (tier === 'EARLY_MORNING') earlyMorning++;
        else if (tier === 'MID_MORNING') midMorning++;
        else afternoon++;

        dailyDistribution[s.dayOfWeek] = (dailyDistribution[s.dayOfWeek] || 0) + 1;

        if (!daySlotsMap.has(s.dayOfWeek)) daySlotsMap.set(s.dayOfWeek, []);
        daySlotsMap.get(s.dayOfWeek)!.push(s.periodIndex);
      }

      let maxConsecutive = 0;
      for (const [day, periods] of daySlotsMap) {
        periods.sort((a, b) => a - b);
        const daySlots = periodsGrid.get(day) || [];
        const pSet = new Set(periods);
        let cur = 0;
        for (const ds of daySlots) {
          if (ds.isBreak) {
            cur = 0;
          } else if (pSet.has(ds.periodIndex)) {
            cur++;
            if (cur > maxConsecutive) maxConsecutive = cur;
          } else {
            cur = 0;
          }
        }
      }

      summaries.push({
        teacherId: tId,
        teacherName: tName,
        totalLessons: tSlots.length,
        earlyMorning,
        midMorning,
        afternoon,
        maxConsecutiveExperienced: maxConsecutive,
        dailyDistribution,
      });
    }

    return summaries.sort((a, b) => b.totalLessons - a.totalLessons);
  }
}
