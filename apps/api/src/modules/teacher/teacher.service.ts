import { db } from '../../config/db.js';
import {
  classes,
  students,
  guardians,
  teacherSubjectAllocations,
  markingAllocations,
  subjects,
  examinations,
  examScores,
  markSubmissions,
  attendanceRegisters,
  attendanceRecords,
  users,
  systemSettings,
  calculateCbcRubric,
  calculateJuniorPoints,
  isJuniorSecondaryClass,
  eq,
  and,
  isNull,
  desc,
  inArray,
} from '@school/shared';
import { SmsService } from '../../services/sms.service.js';
import { LeaveRequestsService } from '../leave-requests/leaveRequests.service.js';

export class TeacherService {
  /**
   * Aggregates live workstation overview data for the authenticated teacher:
   * 1. Assigned class as Class Teacher (if any) + today's attendance status
   * 2. Subject allocations as Subject Teacher
   * 3. Active examination mark entry queues and submission statuses
   */
  static async getTeacherWorkstation(userId: string) {
    // 1. Fetch Teacher User Profile
    const [teacher] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        tscNumber: users.tscNumber,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Check if assigned as Class Teacher for any active class, or standing in for a class teacher on leave
    let [assignedClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.classTeacherId, userId), isNull(classes.deletedAt)));

    let isStandingIn = false;
    let standingInFor: string | null = null;

    if (!assignedClass) {
      const delegation = await LeaveRequestsService.getActiveStandInDelegationForTeacher(userId);
      if (delegation) {
        assignedClass = delegation.assignedClass;
        isStandingIn = true;
        standingInFor = `${delegation.originalTeacher.firstName} ${delegation.originalTeacher.lastName}`;
      }
    }

    let classTeacherInfo: any = null;

    if (assignedClass) {
      // Count enrolled active students
      const enrolledStudents = await db
        .select({ id: students.id })
        .from(students)
        .where(
          and(
            eq(students.classId, assignedClass.id),
            eq(students.status, 'ACTIVE'),
            isNull(students.deletedAt)
          )
        );

      // Check today's register
      const [todayRegister] = await db
        .select()
        .from(attendanceRegisters)
        .where(
          and(
            eq(attendanceRegisters.classId, assignedClass.id),
            eq(attendanceRegisters.date, todayStr),
            isNull(attendanceRegisters.deletedAt)
          )
        );

      let todayStats = {
        isSubmitted: false,
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
        totalEnrolled: enrolledStudents.length,
      };

      if (todayRegister) {
        const records = await db
          .select()
          .from(attendanceRecords)
          .where(eq(attendanceRecords.registerId, todayRegister.id));

        todayStats = {
          isSubmitted: true,
          presentCount: records.filter((r) => r.status === 'PRESENT').length,
          absentCount: records.filter((r) => r.status === 'ABSENT').length,
          excusedCount: records.filter((r) => r.status === 'EXCUSED').length,
          totalEnrolled: enrolledStudents.length,
        };
      }

      classTeacherInfo = {
        classId: assignedClass.id,
        className: assignedClass.name,
        levelCategory: assignedClass.levelCategory,
        numericOrder: assignedClass.numericOrder,
        studentCount: enrolledStudents.length,
        todayAttendance: todayStats,
        isStandingIn,
        standingInFor,
      };
    }

    // 3. Fetch Subject Allocations where teacher is allocated
    const allocations = await db
      .select({
        allocationId: teacherSubjectAllocations.id,
        academicYear: teacherSubjectAllocations.academicYear,
        classId: classes.id,
        className: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherSubjectAllocations)
      .innerJoin(classes, eq(teacherSubjectAllocations.classId, classes.id))
      .innerJoin(subjects, eq(teacherSubjectAllocations.subjectId, subjects.id))
      .where(
        and(
          eq(teacherSubjectAllocations.teacherId, userId),
          isNull(teacherSubjectAllocations.deletedAt),
          isNull(classes.deletedAt)
        )
      )
      .orderBy(classes.numericOrder, subjects.name);

    // If teacher is Class Teacher for PPE or Lower Primary (Grades 1-3),
    // they also teach all subjects for their assigned class
    interface TeachingAreaItem {
      allocationId: string;
      academicYear: number;
      classId: string;
      className: string;
      levelCategory: any;
      numericOrder: number;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      isDoSMarkingAllocation?: boolean;
      examId?: string;
    }

    let allTeachingAreas: TeachingAreaItem[] = allocations.map((a) => ({ ...a }));

    if (
      assignedClass &&
      (assignedClass.levelCategory === 'PPE' ||
        assignedClass.levelCategory === 'LOWER_PRIMARY' ||
        assignedClass.numericOrder <= 3)
    ) {
      // Fetch all subjects for this level category
      const classSubjects = await db
        .select()
        .from(subjects)
        .where(
          and(
            eq(subjects.levelCategory, assignedClass.levelCategory),
            isNull(subjects.deletedAt)
          )
        );

      for (const subj of classSubjects) {
        const alreadyIncluded = allTeachingAreas.some(
          (a) => a.classId === assignedClass.id && a.subjectId === subj.id
        );
        if (!alreadyIncluded) {
          allTeachingAreas.push({
            allocationId: `class-teacher-${subj.id}`,
            academicYear: new Date().getFullYear(),
            classId: assignedClass.id,
            className: assignedClass.name,
            levelCategory: assignedClass.levelCategory,
            numericOrder: assignedClass.numericOrder,
            subjectId: subj.id,
            subjectName: subj.name,
            subjectCode: subj.code,
          });
        }
      }
    }

    // 3b. Fetch DoS Paper Marking Allocations for this examiner (Grades 4-9)
    const markingAllocs = await db
      .select({
        allocationId: markingAllocations.id,
        examId: markingAllocations.examId,
        classId: classes.id,
        className: classes.name,
        levelCategory: classes.levelCategory,
        numericOrder: classes.numericOrder,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(markingAllocations)
      .innerJoin(classes, eq(markingAllocations.classId, classes.id))
      .innerJoin(subjects, eq(markingAllocations.subjectId, subjects.id))
      .where(
        and(
          eq(markingAllocations.teacherId, userId),
          isNull(markingAllocations.deletedAt),
          isNull(classes.deletedAt)
        )
      );

    for (const ma of markingAllocs) {
      const alreadyIncluded = allTeachingAreas.some(
        (a) => a.classId === ma.classId && a.subjectId === ma.subjectId && a.examId === ma.examId
      );
      if (!alreadyIncluded) {
        allTeachingAreas.push({
          allocationId: ma.allocationId,
          academicYear: new Date().getFullYear(),
          classId: ma.classId,
          className: ma.className,
          levelCategory: ma.levelCategory,
          numericOrder: ma.numericOrder,
          subjectId: ma.subjectId,
          subjectName: ma.subjectName,
          subjectCode: ma.subjectCode,
          isDoSMarkingAllocation: true,
          examId: ma.examId,
        });
      }
    }

    // 4. Fetch Active Examinations and construct Mark Entry Queue
    const activeExams = await db
      .select()
      .from(examinations)
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(examinations.createdAt));

    const markEntryTasks: any[] = [];
    let pendingCorrectionsCount = 0;

    for (const exam of activeExams) {
      for (const area of allTeachingAreas) {
        // If this area was allocated by DoS specifically for an exam, only generate task for that exam
        if ((area as any).examId && (area as any).examId !== exam.id) {
          continue;
        }

        // Check submission record
        const [submission] = await db
          .select()
          .from(markSubmissions)
          .where(
            and(
              eq(markSubmissions.examId, exam.id),
              eq(markSubmissions.classId, area.classId),
              eq(markSubmissions.subjectId, area.subjectId)
            )
          );

        // Count scores entered
        const scores = await db
          .select({ studentId: examScores.studentId })
          .from(examScores)
          .innerJoin(students, eq(examScores.studentId, students.id))
          .where(
            and(
              eq(examScores.examId, exam.id),
              eq(examScores.subjectId, area.subjectId),
              eq(students.classId, area.classId),
              eq(students.status, 'ACTIVE'),
              isNull(students.deletedAt)
            )
          );

        // Active students count in that class
        const classStudentsList = await db
          .select({ id: students.id })
          .from(students)
          .where(
            and(
              eq(students.classId, area.classId),
              eq(students.status, 'ACTIVE'),
              isNull(students.deletedAt)
            )
          );

        const totalStudents = classStudentsList.length;
        const scoredCount = scores.length;

        let status = submission?.status || (scoredCount > 0 ? 'DRAFT' : 'NOT_STARTED');
        if (status === 'CORRECTION_REQUESTED') {
          pendingCorrectionsCount++;
        }

        markEntryTasks.push({
          examId: exam.id,
          examTitle: exam.title,
          classId: area.classId,
          className: area.className,
          subjectId: area.subjectId,
          subjectName: area.subjectName,
          subjectCode: area.subjectCode,
          submissionId: submission?.id || null,
          status,
          correctionReason: submission?.correctionReason || null,
          scoredStudents: scoredCount,
          totalStudents,
          isComplete: scoredCount >= totalStudents && totalStudents > 0,
        });
      }
    }

    return {
      teacher,
      classTeacher: classTeacherInfo,
      subjectAllocations: allTeachingAreas,
      markEntryTasks,
      alerts: {
        pendingCorrections: pendingCorrectionsCount,
        hasUnmarkedAttendanceToday:
          classTeacherInfo && !classTeacherInfo.todayAttendance.isSubmitted,
      },
    };
  }

  /**
   * Retrieves student roster for teacher's class with guardian contacts,
   * attendance history %, and recent academic standing
   */
  static async getClassLearners(userId: string, requestedClassId?: string) {
    let targetClassId = requestedClassId;

    if (!targetClassId) {
      let [assignedClass] = await db
        .select()
        .from(classes)
        .where(and(eq(classes.classTeacherId, userId), isNull(classes.deletedAt)));

      if (!assignedClass) {
        const delegation = await LeaveRequestsService.getActiveStandInDelegationForTeacher(userId);
        if (delegation) {
          assignedClass = delegation.assignedClass;
        }
      }

      if (!assignedClass) {
        throw new Error('No class assigned to you as Class Teacher');
      }
      targetClassId = assignedClass.id;
    }

    const [targetClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, targetClassId));

    if (!targetClass) {
      throw new Error('Class not found');
    }

    // Fetch active students in class
    const classStudents = await db
      .select({
        student: students,
        guardian: guardians,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .where(
        and(
          eq(students.classId, targetClassId),
          eq(students.status, 'ACTIVE'),
          isNull(students.deletedAt)
        )
      )
      .orderBy(students.firstName, students.lastName);

    // Fetch total registers for this class to calculate attendance rates
    const registers = await db
      .select({ id: attendanceRegisters.id })
      .from(attendanceRegisters)
      .where(
        and(
          eq(attendanceRegisters.classId, targetClassId),
          isNull(attendanceRegisters.deletedAt)
        )
      );

    const totalRegisters = registers.length;
    const registerIds = registers.map((r) => r.id);

    let allAttendanceRecords: any[] = [];
    if (registerIds.length > 0) {
      allAttendanceRecords = await db
        .select()
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.registerId, registerIds));
    }

    // Fetch recent exam scores for these students to compute average mark
    const studentIds = classStudents.map((cs) => cs.student.id);
    let allScores: any[] = [];
    if (studentIds.length > 0) {
      allScores = await db
        .select()
        .from(examScores)
        .where(inArray(examScores.studentId, studentIds));
    }

    let classTotalScore = 0;
    let scoredLearnersCount = 0;
    let chronicAbsenteeCount = 0;

    const learners = classStudents.map((cs) => {
      const studentRecords = allAttendanceRecords.filter((r) => r.studentId === cs.student.id);
      const presentCount = studentRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = studentRecords.filter((r) => r.status === 'ABSENT').length;
      const attendanceRate = totalRegisters > 0 ? Math.round((presentCount / totalRegisters) * 100) : 100;

      if (attendanceRate < 85 && totalRegisters >= 3) {
        chronicAbsenteeCount++;
      }

      const scores = allScores.filter((s) => s.studentId === cs.student.id);
      let studentAvg: number | null = null;
      if (scores.length > 0) {
        const sum = scores.reduce((acc, curr) => acc + parseFloat(curr.marksObtained), 0);
        studentAvg = Math.round((sum / scores.length) * 10) / 10;
        classTotalScore += studentAvg;
        scoredLearnersCount++;
      }

      return {
        studentId: cs.student.id,
        admissionNumber: cs.student.admissionNumber,
        assessmentNumber: cs.student.assessmentNumber,
        fullName: `${cs.student.firstName} ${cs.student.middleName || ''} ${cs.student.lastName}`
          .replace(/\s+/g, ' ')
          .trim(),
        gender: cs.student.gender,
        guardianName: cs.guardian.fullName,
        guardianPhone: cs.guardian.phoneNumber,
        emergencyContact: cs.guardian.emergencyContact,
        attendance: {
          totalDays: totalRegisters,
          presentDays: presentCount,
          absentDays: absentCount,
          attendanceRate,
          isChronicAbsent: attendanceRate < 85 && totalRegisters >= 3,
        },
        academicAverage: studentAvg,
      };
    });

    const overallClassAverage =
      scoredLearnersCount > 0 ? Math.round((classTotalScore / scoredLearnersCount) * 10) / 10 : 0;

    return {
      class: targetClass,
      totalLearners: learners.length,
      overallClassAverage,
      chronicAbsenteeCount,
      learners,
    };
  }

  /**
   * Retrieves a learner's comprehensive academic scorecard and performance trend across examinations
   */
  static async getLearnerPerformance(studentId: string) {
    const [studentData] = await db
      .select({
        student: students,
        guardian: guardians,
        class: classes,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, studentId));

    if (!studentData) {
      throw new Error('Student not found');
    }

    // Fetch all scores for this student
    const scores = await db
      .select({
        score: examScores,
        exam: examinations,
        subject: subjects,
      })
      .from(examScores)
      .innerJoin(examinations, eq(examScores.examId, examinations.id))
      .innerJoin(subjects, eq(examScores.subjectId, subjects.id))
      .where(eq(examScores.studentId, studentId))
      .orderBy(desc(examinations.createdAt));

    // Group scores by examination
    const examMap = new Map<string, { exam: any; scores: any[]; total: number }>();
    const isJunior = isJuniorSecondaryClass(studentData.class);
    const gradingType: 'POINTS' | 'RUBRIC' = isJunior ? 'POINTS' : 'RUBRIC';

    for (const item of scores) {
      if (!examMap.has(item.exam.id)) {
        examMap.set(item.exam.id, {
          exam: item.exam,
          scores: [],
          total: 0,
        });
      }
      const entry = examMap.get(item.exam.id)!;
      const markNum = parseFloat(item.score.marksObtained);
      const maxMarks = item.score.maxMarks || 100;
      entry.scores.push({
        subjectId: item.subject.id,
        subjectName: item.subject.name,
        subjectCode: item.subject.code,
        marksObtained: markNum,
        maxMarks,
        cbcRubricLevel: isJunior ? null : (item.score.cbcRubricLevel || calculateCbcRubric(markNum, maxMarks).code),
        juniorPoints: isJunior ? (item.score.juniorPoints ?? calculateJuniorPoints(markNum, maxMarks)) : null,
        teacherRemarks: item.score.teacherRemarks,
      });
      entry.total += markNum;
    }

    const examHistory = Array.from(examMap.values()).map((e) => {
      const avg = e.scores.length > 0 ? Math.round((e.total / e.scores.length) * 10) / 10 : 0;
      return {
        examId: e.exam.id,
        examTitle: e.exam.title,
        createdAt: e.exam.createdAt,
        subjectCount: e.scores.length,
        averageMark: avg,
        scores: e.scores,
      };
    });

    // Determine performance trend
    let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (examHistory.length >= 2) {
      const recent = examHistory[0].averageMark;
      const previous = examHistory[1].averageMark;
      const diff = recent - previous;
      if (diff >= 2) trend = 'IMPROVING';
      else if (diff <= -2) trend = 'DECLINING';
      else trend = 'STABLE';
    }

    return {
      student: {
        id: studentData.student.id,
        admissionNumber: studentData.student.admissionNumber,
        assessmentNumber: studentData.student.assessmentNumber,
        fullName: `${studentData.student.firstName} ${studentData.student.middleName || ''} ${studentData.student.lastName}`
          .replace(/\s+/g, ' ')
          .trim(),
        gender: studentData.student.gender,
        className: studentData.class.name,
        guardianName: studentData.guardian.fullName,
        guardianPhone: studentData.guardian.phoneNumber,
        isJunior,
        gradingType,
      },
      isJunior,
      gradingType,
      examHistory,
      trend,
    };
  }

  /**
   * Controlled SMS dispatch to guardian using approved message templates
   */
  static async sendLearnerControlledSms(
    studentId: string,
    templateType: 'ACADEMIC_PROGRESS' | 'ATTENDANCE_CONCERN' | 'COMMENDATION' | 'CUSTOM_CONTROLLED',
    customNote?: string
  ) {
    const [studentData] = await db
      .select({
        student: students,
        guardian: guardians,
        class: classes,
      })
      .from(students)
      .innerJoin(guardians, eq(students.primaryGuardianId, guardians.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, studentId));

    if (!studentData) {
      throw new Error('Student or guardian record not found');
    }

    const { student, guardian, class: studentClass } = studentData;

    // Fetch school name from settings
    const settings = await db.select().from(systemSettings).limit(1);
    const schoolName = settings[0]?.schoolName || 'Eldoret Muslim Academy';

    let message = '';
    const studentName = `${student.firstName} ${student.lastName}`;

    switch (templateType) {
      case 'ACADEMIC_PROGRESS':
        message = `${schoolName} Academic Notice: Dear ${guardian.fullName}, this is an academic update for ${studentName} (${studentClass.name}). Regular assessments are ongoing. Please review their progress and encourage consistent study habits at home.`;
        break;
      case 'ATTENDANCE_CONCERN':
        message = `${schoolName} Attendance Notice: Dear ${guardian.fullName}, ${studentName} has accumulated repeated unexcused absences in ${studentClass.name}. Consistent class attendance is vital for learning. Please contact the class teacher urgently.`;
        break;
      case 'COMMENDATION':
        message = `${schoolName} Commendation: Dear ${guardian.fullName}, we are pleased to commend ${studentName} (${studentClass.name}) for commendable effort, diligence, and positive character in class. Keep up the great work!`;
        break;
      case 'CUSTOM_CONTROLLED':
        if (!customNote || customNote.trim().length === 0) {
          throw new Error('A brief message note is required for custom controlled contact');
        }
        message = `${schoolName} Class Teacher Note: Dear ${guardian.fullName} (re: ${studentName}), ${customNote.trim()}`;
        break;
      default:
        throw new Error('Invalid template type specified');
    }

    const smsLog = await SmsService.sendSms(
      guardian.phoneNumber,
      message,
      student.id,
      guardian.id
    );

    return {
      success: true,
      smsLog,
      messagePreview: message,
      recipientPhone: guardian.phoneNumber,
    };
  }
}
