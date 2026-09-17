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
  if (classInfo.numericOrder !== undefined && classInfo.numericOrder !== null) {
    return classInfo.numericOrder >= 7;
  }
  if (classInfo.levelCategory) {
    return classInfo.levelCategory === 'JUNIOR';
  }
  if (classInfo.name) {
    const match = classInfo.name.match(/\b(Grade|Class)\s*([0-9]+)/i);
    if (match) {
      const num = parseInt(match[2], 10);
      return num >= 7;
    }
  }
  return false;
}
