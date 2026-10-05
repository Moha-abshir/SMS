import { db } from '../../config/db.js';
import { attendanceRegisters, attendanceRecords, students, guardians, classes, users, absenceSmsLogs, systemSettings, eq, inArray, isNull, and, desc } from '@school/shared';
import { SmsService } from '../../services/sms.service.js';

export class AttendanceService {
  static async getSchoolWideAttendance(targetDate?: string) {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    // 1. Fetch all classes ordered
    const totalClasses = await db
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    // 2. Fetch all active students count per class
    const allActiveStudents = await db
      .select({
        id: students.id,
        classId: students.classId,
      })
      .from(students)
      .where(and(eq(students.status, 'ACTIVE'), isNull(students.deletedAt)));

    // 3. Fetch all class registers for the date with submitted teacher details
    const registers = await db
      .select({
        register: attendanceRegisters,
        class: classes,
        takenByUser: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceRegisters)
      .innerJoin(classes, eq(attendanceRegisters.classId, classes.id))
      .leftJoin(users, eq(attendanceRegisters.takenById, users.id))
      .where(and(eq(attendanceRegisters.date, dateStr), isNull(attendanceRegisters.deletedAt)))
      .orderBy(classes.numericOrder);

    const registerIds = registers.map((r) => r.register.id);

    // 4. Fetch all records for these registers
    let records: any[] = [];
    if (registerIds.length > 0) {
      records = await db
        .select({
          record: attendanceRecords,
          student: students,
          guardian: guardians,
          class: classes,
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .leftJoin(guardians, eq(students.primaryGuardianId, guardians.id))
        .innerJoin(attendanceRegisters, eq(attendanceRecords.registerId, attendanceRegisters.id))
        .innerJoin(classes, eq(attendanceRegisters.classId, classes.id))
        .where(inArray(attendanceRecords.registerId, registerIds));
    }

    const totalPresent = records.filter((r) => r.record.status === 'PRESENT').length;
    const totalAbsentRecords = records.filter((r) => r.record.status === 'ABSENT');
    const totalExcused = records.filter((r) => r.record.status === 'EXCUSED').length;

    // Fetch SMS logs and match ONLY logs dispatched for this specific target date
    const smsLogs = await db
      .select()
      .from(absenceSmsLogs)
      .orderBy(desc(absenceSmsLogs.createdAt));

    const absentStudents = totalAbsentRecords.map((r) => {
      const smsSent = smsLogs.find((s) => {
        if (s.studentId !== r.student.id) return false;
        if (!s.sentAt) return false;
        // Format log sentAt to YYYY-MM-DD in school timezone (Africa/Nairobi)
        const logDate = new Date(s.sentAt).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
        return logDate === dateStr;
      });

      return {
        recordId: r.record.id,
        studentId: r.student.id,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        assessmentNumber: r.student.assessmentNumber,
        className: r.class.name,
        guardianName: r.guardian?.fullName || 'Parent / Guardian',
        guardianPhone: r.guardian?.phoneNumber || '',
        guardianId: r.guardian?.id || null,
        smsSentStatus: smsSent ? smsSent.status : null,
      };
    });

    // 5. Group by class summary for Deputy overview
    const classSummaries = totalClasses.map((c) => {
      const reg = registers.find((r) => r.class.id === c.id);
      const classRecords = reg ? records.filter((r) => r.class.id === c.id) : [];
      const present = classRecords.filter((r) => r.record.status === 'PRESENT').length;
      const absent = classRecords.filter((r) => r.record.status === 'ABSENT').length;
      const excused = classRecords.filter((r) => r.record.status === 'EXCUSED').length;
      const enrolledCount = allActiveStudents.filter((s) => s.classId === c.id).length || classRecords.length;
      const teacherName = reg?.takenByUser?.firstName ? `${reg.takenByUser.firstName} ${reg.takenByUser.lastName}`.trim() : null;

      return {
        classId: c.id,
        className: c.name,
        levelCategory: c.levelCategory,
        numericOrder: c.numericOrder,
        isSubmitted: Boolean(reg?.register?.isSubmitted ?? !!reg),
        submitted: Boolean(reg?.register?.isSubmitted ?? !!reg),
        registerId: reg?.register.id || null,
        totalEnrolled: enrolledCount,
        totalStudents: enrolledCount,
        presentCount: present,
        absentCount: absent,
        excusedCount: excused,
        submittedAt: reg?.register.updatedAt || reg?.register.createdAt || null,
        submittedByTeacher: teacherName,
      };
    }).sort((a, b) => a.numericOrder - b.numericOrder);

    return {
      date: dateStr,
      totalClassesCount: totalClasses.length,
      registersSubmittedCount: registers.filter((r) => r.register.isSubmitted).length,
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

    const [registerData] = await db
      .select({
        register: attendanceRegisters,
        takenByUser: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceRegisters)
      .leftJoin(users, eq(attendanceRegisters.takenById, users.id))
      .where(
        and(
          eq(attendanceRegisters.classId, classId),
          eq(attendanceRegisters.date, dateStr),
          isNull(attendanceRegisters.deletedAt)
        )
      );

    const register = registerData?.register;
    const takenByUser = registerData?.takenByUser;

    // Fetch active students in this class with leftJoin to guardians
    const classStudents = await db
      .select({
        student: students,
        guardian: guardians,
      })
      .from(students)
      .leftJoin(guardians, eq(students.primaryGuardianId, guardians.id))
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
        studentName: `${cs.student.firstName} ${cs.student.lastName}`.trim(),
        assessmentNumber: cs.student.assessmentNumber || cs.student.admissionNumber || cs.student.id.slice(0, 8),
        admissionNumber: cs.student.admissionNumber || cs.student.assessmentNumber || cs.student.id.slice(0, 8),
        gender: cs.student.gender,
        guardianName: cs.guardian?.fullName || 'Parent / Guardian',
        guardianPhone: cs.guardian?.phoneNumber || '',
        status: rec?.status || 'PRESENT',
        remarks: rec?.remarks || '',
      };
    });

    const presentCount = studentRows.filter((s) => s.status === 'PRESENT').length;
    const absentCount = studentRows.filter((s) => s.status === 'ABSENT').length;
    const excusedCount = studentRows.filter((s) => s.status === 'EXCUSED').length;

    const records = studentRows.map((s) => ({
      studentId: s.studentId,
      admissionNumber: s.admissionNumber,
      studentName: s.studentName,
      status: s.status,
      remarks: s.remarks,
      gender: s.gender,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
    }));

    return {
      class: targetClass,
      date: dateStr,
      isSubmitted: Boolean(register?.isSubmitted ?? !!register),
      submitted: Boolean(register?.isSubmitted ?? !!register),
      registerId: register?.id || null,
      submittedBy: takenByUser?.firstName ? `${takenByUser.firstName} ${takenByUser.lastName || ''}`.trim() : null,
      submittedAt: register?.updatedAt || register?.createdAt || null,
      students: studentRows,
      records,
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
        .where(
          and(
            eq(attendanceRegisters.classId, classId),
            eq(attendanceRegisters.date, dateStr),
            isNull(attendanceRegisters.deletedAt)
          )
        );

      if (register && register.isSubmitted) {
        throw new Error(
          `The attendance register for this class on ${dateStr} has already been submitted and locked. Resubmission is blocked to preserve audit integrity.`
        );
      }

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

    const message = `Dear Parent, your child ${studentName} was marked ABSENT at ${schoolName} today (${new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })}). Please contact the school if you have any questions.`;

    const smsLog = await SmsService.sendSms(guardianPhone, message, studentId, guardianId);
    return smsLog;
  }

  static async getClassAttendanceHistory(classId: string) {
    const [targetClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));

    if (!targetClass) throw new Error('Class not found');

    const registers = await db
      .select()
      .from(attendanceRegisters)
      .where(and(eq(attendanceRegisters.classId, classId), isNull(attendanceRegisters.deletedAt)))
      .orderBy(desc(attendanceRegisters.date));

    const totalRegisters = registers.length;
    const registerIds = registers.map((r) => r.id);

    const classStudents = await db
      .select({
        student: students,
        guardian: guardians,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .where(and(eq(students.classId, classId), eq(students.status, 'ACTIVE'), isNull(students.deletedAt)))
      .orderBy(students.firstName, students.lastName);

    let allRecords: any[] = [];
    if (registerIds.length > 0) {
      allRecords = await db
        .select()
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.registerId, registerIds));
    }

    let totalPossibleAttendances = totalRegisters * classStudents.length;
    let totalPresentAcrossAll = 0;

    const studentRows = classStudents.map((cs) => {
      const records = allRecords.filter((r) => r.studentId === cs.student.id);
      const presentCount = records.filter((r) => r.status === 'PRESENT').length;
      const absentCount = records.filter((r) => r.status === 'ABSENT').length;
      const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;
      const lateCount = records.filter((r) => r.status === 'LATE').length;

      totalPresentAcrossAll += presentCount;
      const attendanceRate = totalRegisters > 0 ? Math.round((presentCount / totalRegisters) * 100) : 100;

      return {
        studentId: cs.student.id,
        admissionNumber: cs.student.admissionNumber,
        assessmentNumber: cs.student.assessmentNumber,
        fullName: `${cs.student.firstName} ${cs.student.middleName || ''} ${cs.student.lastName}`.replace(/\s+/g, ' ').trim(),
        gender: cs.student.gender,
        guardianName: cs.guardian.fullName,
        guardianPhone: cs.guardian.phoneNumber,
        stats: {
          totalDays: totalRegisters,
          presentDays: presentCount,
          absentDays: absentCount,
          excusedDays: excusedCount,
          lateDays: lateCount,
          attendanceRate,
          isChronicAbsent: attendanceRate < 85 && totalRegisters >= 3,
        },
      };
    });

    const overallAttendanceRate =
      totalPossibleAttendances > 0
        ? Math.round((totalPresentAcrossAll / totalPossibleAttendances) * 100)
        : 100;

    return {
      class: targetClass,
      totalRegisters,
      overallAttendanceRate,
      students: studentRows,
      recentRegisters: registers.slice(0, 10),
    };
  }
}

