export * from '../validators/index.js';

export type LevelCategory = 'PRIMARY' | 'JUNIOR' | 'PPE';
export type StudentStatus = 'ACTIVE' | 'TRANSFERRED' | 'EXPELLED' | 'GRADUATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
export type ExamStatus = 'DRAFT' | 'MARKS_ENTRY' | 'PENDING_DEPUTY_APPROVAL' | 'LOCKED';
export type PaymentMethod = 'CASH' | 'MANUAL_MPESA' | 'MPESA_STK_PUSH' | 'BANK_DEPOSIT';

export interface CbcRubricResult {
  code: 'EE' | 'ME' | 'AE' | 'BE';
  level: number;
  label: string;
}

export function calculateCbcRubric(marks: number, totalMarks = 100): CbcRubricResult {
  const percentage = totalMarks > 0 ? Math.round(((marks / totalMarks) * 100) * 10000) / 10000 : marks;
  if (percentage >= 75) {
    return { code: 'EE', level: 4, label: 'Exceeding Expectations' };
  } else if (percentage >= 50) {
    return { code: 'ME', level: 3, label: 'Meeting Expectations' };
  } else if (percentage >= 25) {
    return { code: 'AE', level: 2, label: 'Approaching Expectations' };
  } else {
    return { code: 'BE', level: 1, label: 'Below Expectations' };
  }
}

export function calculateJuniorPoints(marks: number, totalMarks = 100): number {
  const percentage = totalMarks > 0 ? Math.round(((marks / totalMarks) * 100) * 10000) / 10000 : marks;
  if (percentage >= 90) return 8;
  if (percentage >= 75) return 7;
  if (percentage >= 58) return 6;
  if (percentage >= 41) return 5;
  if (percentage >= 31) return 4;
  if (percentage >= 21) return 3;
  if (percentage >= 11) return 2;
  return 1;
}

export function isJuniorSecondaryClass(classInfo?: { levelCategory?: string | null; numericOrder?: number | null; name?: string | null } | null): boolean {
  if (!classInfo) return false;
  if (classInfo.levelCategory) {
    return classInfo.levelCategory === 'JUNIOR';
  }
  if (classInfo.name) {
    if (/JSS|Junior/i.test(classInfo.name)) return true;
    const match = classInfo.name.match(/\b(Grade|Class)\s*([0-9]+)/i);
    if (match) {
      const num = parseInt(match[2], 10);
      return num >= 7;
    }
  }
  if (classInfo.numericOrder !== undefined && classInfo.numericOrder !== null) {
    return classInfo.numericOrder >= 10;
  }
  return false;
}

/**
 * Pre-Primary (PP1, PP2, Playgroup) and Lower Primary (Grades 1-3)
 * where the Class Teacher teaches and marks ALL subjects.
 */
export function isSelfContainedClass(classInfo?: { levelCategory?: string | null; numericOrder?: number | null; name?: string | null } | null): boolean {
  if (!classInfo) return false;
  if (classInfo.levelCategory === 'PPE' || classInfo.levelCategory === 'LOWER_PRIMARY') {
    return true;
  }
  if (classInfo.name) {
    if (/^(PP1|PP2|Playgroup|Baby|Nursery|Pre-Primary)/i.test(classInfo.name.trim())) return true;
    const match = classInfo.name.match(/\b(Grade|Class)\s*([0-9]+)/i);
    if (match) {
      const num = parseInt(match[2], 10);
      return num <= 3;
    }
  }
  if (classInfo.numericOrder !== undefined && classInfo.numericOrder !== null) {
    return classInfo.numericOrder <= 6;
  }
  return false;
}

/**
 * Upper Primary (Grades 4-6) and Junior Secondary (Grades 7-9)
 * where distinct Subject Teachers are allocated by the DoS.
 */
export function isSubjectTeacherClass(classInfo?: { levelCategory?: string | null; numericOrder?: number | null; name?: string | null } | null): boolean {
  if (!classInfo) return false;
  return !isSelfContainedClass(classInfo);
}
