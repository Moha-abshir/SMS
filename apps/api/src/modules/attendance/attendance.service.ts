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

    // 4. Group by class summary for Deputy overview
    const classSummaries = totalClasses.map((c) => {
      const reg = registers.find((r) => r.class.id === c.id);
      const classRecords = reg ? records.filter((r) => r.class.id === c.id) : [];
      const present = classRecords.filter((r) => r.record.status === 'PRESENT').length;
      const absent = classRecords.filter((r) => r.record.status === 'ABSENT').length;
      return {
        classId: c.id,
        className: c.name,
        levelCategory: c.levelCategory,
        numericOrder: c.numericOrder,
        isSubmitted: !!reg,
        registerId: reg?.register.id || null,
        totalEnrolled: classRecords.length,
        presentCount: present,
        absentCount: absent,
      };
    }).sort((a, b) => a.numericOrder - b.numericOrder);

    return {
      date: dateStr,
      totalClassesCount: totalClasses.length,
      registersSubmittedCount: registers.length,
      totalPresent,
      totalAbsent: totalAbsentRecords.length,
      totalExcused,
      absentStudents,
      classSummaries,
    };
  }

  static async getClassRegister(classId: string, targetDate?: string) {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    const [targetClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));

    if (!targetClass) throw new Error('Class not found');

    const [register] = await db
      .select()
      .from(attendanceRegisters)
      .where(and(eq(attendanceRegisters.classId, classId), eq(attendanceRegisters.date, dateStr)));

    // Fetch active students in this class
    const classStudents = await db
      .select({
        student: students,
        guardian: guardians,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .where(and(eq(students.classId, classId), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .orderBy(students.firstName, students.lastName);

    let existingRecords: any[] = [];
    if (register) {
      existingRecords = await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.registerId, register.id));
    }

    const recordsMap = new Map<string, any>();
    existingRecords.forEach((r) => recordsMap.set(r.studentId, r));

    const studentRows = classStudents.map((cs) => {
      const rec = recordsMap.get(cs.student.id);
      return {
        studentId: cs.student.id,
        firstName: cs.student.firstName,
        middleName: cs.student.middleName,
        lastName: cs.student.lastName,
        assessmentNumber: cs.student.assessmentNumber,
        gender: cs.student.gender,
        guardianName: cs.guardian.fullName,
        guardianPhone: cs.guardian.phoneNumber,
        status: rec?.status || 'PRESENT',
        remarks: rec?.remarks || '',
      };
    });

    const presentCount = studentRows.filter((s) => s.status === 'PRESENT').length;
    const absentCount = studentRows.filter((s) => s.status === 'ABSENT').length;
    const excusedCount = studentRows.filter((s) => s.status === 'EXCUSED').length;

    return {
      class: targetClass,
      date: dateStr,
      isSubmitted: !!register,
      registerId: register?.id || null,
      students: studentRows,
      stats: {
        total: studentRows.length,
        present: presentCount,
        absent: absentCount,
        excused: excusedCount,
      },
    };
  }

  static async saveClassRegister(
    classId: string,
    dateStr: string,
    records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'; remarks?: string }>,
    takenById: string
  ) {
    return await db.transaction(async (tx) => {
      let [register] = await tx
        .select()
        .from(attendanceRegisters)
        .where(and(eq(attendanceRegisters.classId, classId), eq(attendanceRegisters.date, dateStr)));

      if (!register) {
        const [newRegister] = await tx
          .insert(attendanceRegisters)
          .values({
            classId,
            date: dateStr,
            takenById,
            isSubmitted: true,
          })
          .returning();
        register = newRegister;
      } else {
        await tx
          .update(attendanceRegisters)
          .set({
            takenById,
            isSubmitted: true,
            updatedAt: new Date(),
          })
          .where(eq(attendanceRegisters.id, register.id));
      }

      for (const item of records) {
        const [existing] = await tx
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.registerId, register.id), eq(attendanceRecords.studentId, item.studentId)));

        if (existing) {
          await tx
            .update(attendanceRecords)
            .set({
              status: item.status,
              remarks: item.remarks || null,
              updatedAt: new Date(),
            })
            .where(eq(attendanceRecords.id, existing.id));
        } else {
          await tx.insert(attendanceRecords).values({
            registerId: register.id,
            studentId: item.studentId,
            status: item.status,
            remarks: item.remarks || null,
          });
        }
      }

      return {
        registerId: register.id,
        date: dateStr,
        totalRecords: records.length,
        message: 'Class register saved successfully',
      };
    });
  }

  static async notifyAllUnnotifiedAbsent(targetDate?: string) {
    const data = await this.getSchoolWideAttendance(targetDate);
    const unnotified = data.absentStudents.filter((s) => !s.smsSentStatus || s.smsSentStatus === 'FAILED');

    let notifiedCount = 0;
    const errors: string[] = [];

    for (const student of unnotified) {
      try {
        await this.notifyParentOfAbsence(
          student.studentId,
          student.guardianId,
          student.guardianPhone,
          student.studentName
        );
        notifiedCount++;
      } catch (err: any) {
        errors.push(`Failed to send SMS for ${student.studentName}: ${err.message}`);
      }
    }

    return {
      totalAbsent: data.absentStudents.length,
      unnotifiedCount: unnotified.length,
      notifiedCount,
      errors,
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
