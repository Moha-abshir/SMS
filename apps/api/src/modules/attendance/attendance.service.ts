import { db } from '../../config/db.js';
import { attendanceRegisters, attendanceRecords, students, guardians, classes, absenceSmsLogs, systemSettings, eq, inArray, isNull, and, desc } from '@school/shared';
import { SmsService } from '../../services/sms.service.js';

export class AttendanceService {
  static async getSchoolWideAttendance(targetDate?: string) {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    // 1. Fetch all class registers for the date
    const registers = await db
      .select({
        register: attendanceRegisters,
        class: classes,
      })
      .from(attendanceRegisters)
      .innerJoin(classes, eq(attendanceRegisters.classId, classes.id))
      .where(and(eq(attendanceRegisters.date, dateStr), isNull(attendanceRegisters.deletedAt)))
      .orderBy(classes.numericOrder);

    // 2. Total classes count
    const totalClasses = await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt));

    if (registers.length === 0) {
      return {
        date: dateStr,
        totalClassesCount: totalClasses.length,
        registersSubmittedCount: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalExcused: 0,
        absentStudents: [],
      };
    }

    const registerIds = registers.map((r) => r.register.id);

    // 3. Fetch all records for these registers
    const records = await db
      .select({
        record: attendanceRecords,
        student: students,
        guardian: guardians,
        class: classes,
      })
      .from(attendanceRecords)
      .innerJoin(students, eq(attendanceRecords.studentId, students.id))
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .innerJoin(attendanceRegisters, eq(attendanceRecords.registerId, attendanceRegisters.id))
      .innerJoin(classes, eq(attendanceRegisters.classId, classes.id))
      .where(inArray(attendanceRecords.registerId, registerIds));

    const totalPresent = records.filter((r) => r.record.status === 'PRESENT').length;
    const totalAbsentRecords = records.filter((r) => r.record.status === 'ABSENT');
    const totalExcused = records.filter((r) => r.record.status === 'EXCUSED').length;

    // Fetch SMS logs sent today
    const smsLogs = await db
      .select()
      .from(absenceSmsLogs)
      .orderBy(desc(absenceSmsLogs.createdAt));

    const absentStudents = totalAbsentRecords.map((r) => {
      const smsSent = smsLogs.find((s) => s.studentId === r.student.id);
      return {
        recordId: r.record.id,
        studentId: r.student.id,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        assessmentNumber: r.student.assessmentNumber,
        className: r.class.name,
        guardianName: r.guardian.fullName,
        guardianPhone: r.guardian.phoneNumber,
        guardianId: r.guardian.id,
        smsSentStatus: smsSent ? smsSent.status : null,
      };
    });

    return {
      date: dateStr,
      totalClassesCount: totalClasses.length,
      registersSubmittedCount: registers.length,
      totalPresent,
      totalAbsent: totalAbsentRecords.length,
      totalExcused,
      absentStudents,
    };
  }

  static async notifyParentOfAbsence(studentId: string, guardianId: string, guardianPhone: string, studentName: string) {
    const [settings] = await db.select().from(systemSettings).limit(1);
    const schoolName = settings?.schoolName || 'Eldoret Muslim Academy';

    const message = `Dear Parent, your child ${studentName} was marked ABSENT at ${schoolName} today (${new Date().toLocaleDateString()}). Please contact the school if you have any questions.`;

    const smsLog = await SmsService.sendSms(guardianPhone, message, studentId, guardianId);
    return smsLog;
  }
}
