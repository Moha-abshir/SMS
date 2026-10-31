import { db } from '../../config/db.js';
import {
  students,
  users,
  classes,
  subjects,
  attendanceRecords,
  attendanceRegisters,
  feePayments,
  studentBills,
  teacherSubjectAllocations,
  markSubmissions,
  inventoryCheckouts,
  teacherLeaveRequests,
  examinations,
  examSessions,
  invigilatorAllocations,
  markingAllocations,
  reportCardLocks,
  examScores,
  catAssessments,
  catScores,
  systemSettings,
  academicTerms,
  eq,
  ne,
  desc,
  and,
  count,
  inArray,
  isNull,
  sql,
} from '@school/shared';

export class DashboardService {
  static async getHeadTeacherOverview() {
    // 1. Total Active Students Count
    const [studentsResult] = await db
      .select({ total: count() })
      .from(students)
      .where(eq(students.status, 'ACTIVE'));

    // 2. Total Active Staff Count
    const [staffResult] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.isActive, true));

    // 3. Today's Attendance % calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRegisters = await db
      .select()
      .from(attendanceRegisters)
      .where(eq(attendanceRegisters.date, todayStr));

    let attendancePercentage = 0;
    let absentCount = 0;

    if (todayRegisters.length > 0) {
      const registerIds = todayRegisters.map((r) => r.id);
      const records = await db
        .select()
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.registerId, registerIds));

      if (records.length > 0) {
        const present = records.filter((r) => r.status === 'PRESENT').length;
        absentCount = records.filter((r) => r.status === 'ABSENT').length;
        attendancePercentage = Math.round((present / records.length) * 1000) / 10;
      }
    }

    // 4. Financial Fee Collections
    const [paymentsSum] = await db
      .select({ totalPaid: sql<string>`COALESCE(SUM(amount_paid), 0)` })
      .from(feePayments)
      .where(eq(feePayments.isReversed, false));

    const [billsSum] = await db
      .select({
        totalBilled: sql<string>`COALESCE(SUM(billed_amount), 0)`,
        totalBalance: sql<string>`COALESCE(SUM(balance), 0)`,
      })
      .from(studentBills);

    const totalPaid = parseFloat(paymentsSum?.totalPaid || '0');
    const totalBilled = parseFloat(billsSum?.totalBilled || '0');
    const totalBalance = parseFloat(billsSum?.totalBalance || '0');

    let collectionRate = 0;
    if (totalBilled > 0) {
      collectionRate = Math.round((totalPaid / totalBilled) * 1000) / 10;
    }

    // 5. System settings & current term
    const [settings] = await db.select().from(systemSettings).limit(1);
    const [currentTerm] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));

    return {
      totalLearners: studentsResult?.total || 0,
      totalStaff: staffResult?.total || 0,
      todayAttendancePercentage: attendancePercentage,
      absentCount,
      totalFeePaid: totalPaid,
      totalFeeBilled: totalBilled,
      totalOutstandingBalance: totalBalance,
      feeCollectionRate: collectionRate,
      schoolName: settings?.schoolName || 'Eldoret Muslim Academy',
      academicYear: settings?.currentAcademicYear || 2026,
      currentTermNumber: currentTerm?.termNumber || 1,
    };
  }

  static async getDeputyOverview() {
    const todayStr = new Date().toISOString().split('T')[0];

    const [classList] = await db.select({ total: count() }).from(classes).where(isNull(classes.deletedAt));
    const [allocationsCount] = await db.select({ total: count() }).from(teacherSubjectAllocations).where(isNull(teacherSubjectAllocations.deletedAt));
    const [submissionsCount] = await db.select({ total: count() }).from(markSubmissions).where(isNull(markSubmissions.deletedAt));
    const [pendingReviews] = await db.select({ total: count() }).from(markSubmissions).where(eq(markSubmissions.status, 'SUBMITTED'));
    const [approvedCount] = await db.select({ total: count() }).from(markSubmissions).where(eq(markSubmissions.status, 'APPROVED'));
    const [studentsResult] = await db.select({ total: count() }).from(students).where(eq(students.status, 'ACTIVE'));

    // Attendance stats for today
    const todayRegisters = await db.select().from(attendanceRegisters).where(eq(attendanceRegisters.date, todayStr));
    let attendancePercentage = 0;
    let absentCount = 0;
    let presentCount = 0;
    const totalStudents = studentsResult?.total || 0;

    if (todayRegisters.length > 0) {
      const registerIds = todayRegisters.map((r) => r.id);
      const records = await db
        .select()
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.registerId, registerIds));
      if (records.length > 0) {
        presentCount = records.filter((r) => r.status === 'PRESENT').length;
        absentCount = records.filter((r) => r.status === 'ABSENT').length;
        attendancePercentage = Math.round((presentCount / records.length) * 1000) / 10;
      }
    }

    // Inventory checkouts & overdue
    const checkouts = await db.select().from(inventoryCheckouts).where(isNull(inventoryCheckouts.deletedAt));
    const activeCheckouts = checkouts.filter((c) => c.status === 'CHECKED_OUT');
    const overdueCheckouts = checkouts.filter((c) => {
      if (c.status === 'OVERDUE') return true;
      if (c.status === 'CHECKED_OUT' && c.expectedReturnDate && c.expectedReturnDate < todayStr) return true;
      return false;
    });

    // Active staff on leave today
    const allLeaves = await db.select().from(teacherLeaveRequests).where(eq(teacherLeaveRequests.status, 'APPROVED'));
    const leavesToday = allLeaves.filter((l) => l.startDate <= todayStr && l.endDate >= todayStr);

    const [settings] = await db.select().from(systemSettings).limit(1);
    const [currentTerm] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));

    return {
      totalClasses: classList?.total || 12,
      activeAllocations: allocationsCount?.total || 0,
      totalMarkSubmissions: submissionsCount?.total || 0,
      pendingMarkReviews: pendingReviews?.total || 0,
      approvedMarkSubmissions: approvedCount?.total || 0,
      attendance: {
        totalStudents,
        presentCount,
        absentCount,
        attendanceRate: attendancePercentage,
        registersSubmitted: todayRegisters.length,
        totalClasses: classList?.total || 12,
      },
      inventory: {
        activeCheckouts: activeCheckouts.length,
        overdueCheckouts: overdueCheckouts.length,
      },
      staffOnLeaveToday: leavesToday.length,
      todayAttendancePercentage: attendancePercentage,
      todayAbsentCount: absentCount,
      activeCheckoutsCount: activeCheckouts.length,
      overdueCheckoutsCount: overdueCheckouts.length,
      staffOnLeaveTodayCount: leavesToday.length,
      schoolName: settings?.schoolName || 'Eldoret Muslim Academy',
      academicYear: settings?.currentAcademicYear || 2026,
      currentTermNumber: currentTerm?.termNumber || 1,
    };
  }

  static async getDosOverview(selectedExamId?: string) {
    const [settings] = await db.select().from(systemSettings).limit(1);
    const [currentTerm] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));

    // 1. All examinations
    const allExams = await db
      .select({
        id: examinations.id,
        title: examinations.title,
        status: examinations.status,
        startDate: examinations.startDate,
        endDate: examinations.endDate,
        createdAt: examinations.createdAt,
      })
      .from(examinations)
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(examinations.createdAt));

    const activeExams = allExams.filter((e) => e.status === 'APPROVED');
    const concludedExams = allExams.filter((e) => e.status === 'LOCKED');
    const isExamPeriodActive = activeExams.length > 0;
    const activeMode: 'EXAMS' | 'CATS' = isExamPeriodActive ? 'EXAMS' : 'CATS';

    // 2. Identify target exams for KPIs
    let targetExamIds: string[] = [];
    let selectedExamTitle = 'All Term Exams';

    if (selectedExamId && selectedExamId !== 'all') {
      const match = allExams.find((e) => e.id === selectedExamId);
      if (match) {
        targetExamIds = [match.id];
        selectedExamTitle = match.title;
      }
    }

    if (targetExamIds.length === 0) {
      if (activeExams.length > 0) {
        targetExamIds = activeExams.map((e) => e.id);
      } else if (allExams.length > 0) {
        targetExamIds = allExams.map((e) => e.id);
      }
    }

    // 3. Option 3 KPI: Paper Sessions Completion
    let totalSessions = 0;
    let completedSessions = 0;
    let completionRate = 0;

    if (targetExamIds.length > 0) {
      const sessions = await db
        .select({
          id: examSessions.id,
          sessionDate: examSessions.sessionDate,
        })
        .from(examSessions)
        .where(and(inArray(examSessions.examId, targetExamIds), isNull(examSessions.deletedAt)));

      totalSessions = sessions.length;
      const todayStr = new Date().toISOString().split('T')[0];
      completedSessions = sessions.filter((s) => s.sessionDate <= todayStr).length;
      completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    }

    // 4. Option 3 KPI: Class Marksheet Submissions Progress
    let submittedCount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    let correctionCount = 0;
    let totalSubmissionsCount = 0;

    if (targetExamIds.length > 0) {
      const submissions = await db
        .select({
          id: markSubmissions.id,
          status: markSubmissions.status,
        })
        .from(markSubmissions)
        .where(and(inArray(markSubmissions.examId, targetExamIds), isNull(markSubmissions.deletedAt)));

      totalSubmissionsCount = submissions.length;

      submissions.forEach((s) => {
        if (['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'].includes(s.status)) {
          submittedCount++;
        }
        if (['APPROVED', 'LOCKED'].includes(s.status)) {
          verifiedCount++;
        } else if (['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(s.status)) {
          pendingCount++;
        } else if (s.status === 'CORRECTION_REQUESTED') {
          correctionCount++;
        }
      });
    }

    const nonPlaygroupClasses = await db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(and(ne(classes.name, 'Playgroup'), isNull(classes.deletedAt)));

    const classIds = nonPlaygroupClasses.map((c) => c.id);
    let expectedAllocations = 0;
    if (classIds.length > 0) {
      const allocs = await db
        .select({ id: teacherSubjectAllocations.id })
        .from(teacherSubjectAllocations)
        .where(and(inArray(teacherSubjectAllocations.classId, classIds), isNull(teacherSubjectAllocations.deletedAt)));
      expectedAllocations = allocs.length;
    }

    // Expected class marksheets: the maximum of recorded exam marksheets or class allocations
    const baseExpected = Math.max(totalSubmissionsCount, expectedAllocations * (targetExamIds.length || 1));
    const totalExpected = baseExpected > 0 ? baseExpected : totalSubmissionsCount;

    const marksSubmissionRate = totalExpected > 0 ? Math.min(100, Math.round((submittedCount / totalExpected) * 100)) : 0;
    const dosVerificationRate = submittedCount > 0 ? Math.round((verifiedCount / submittedCount) * 100) : 0;

    // 5. Option 3 KPI: Report Release Readiness (Classes Locked)
    const [locksCount] = await db.select({ total: count() }).from(reportCardLocks).where(isNull(reportCardLocks.deletedAt));
    const [lockedCount] = await db.select({ total: count() }).from(reportCardLocks).where(and(eq(reportCardLocks.isLocked, true), isNull(reportCardLocks.deletedAt)));
    const totalClassesCount = nonPlaygroupClasses.length || 12;
    const activeLocksCount = lockedCount?.total || 0;
    const reportReleaseReadiness = totalClassesCount > 0 ? Math.round((activeLocksCount / totalClassesCount) * 100) : 0;

    // 6. Academic Score Average
    const scores = await db
      .select({ marksObtained: examScores.marksObtained })
      .from(examScores)
      .where(isNull(examScores.deletedAt));

    let totalMarks = 0;
    scores.forEach((s) => {
      totalMarks += parseFloat(s.marksObtained || '0');
    });
    const schoolAverage = scores.length > 0 ? Math.round((totalMarks / scores.length) * 10) / 10 : 0;

    // 7. Continuous Assessment Tests (CATs) Metrics (Ready to occupy CATs change)
    const catList = await db.select().from(catAssessments).where(isNull(catAssessments.deletedAt));
    const catScoreList = await db.select().from(catScores).where(isNull(catScores.deletedAt));
    const classesWithCats = new Set(catList.map((c) => c.classId)).size;
    const catsClassCoverageRate = totalClassesCount > 0 ? Math.round((classesWithCats / totalClassesCount) * 100) : 0;
    let totalCatScore = 0;
    catScoreList.forEach((s) => {
      totalCatScore += parseFloat(s.marksObtained || '0');
    });
    const catsAverage = catScoreList.length > 0 ? Math.round((totalCatScore / catScoreList.length) * 10) / 10 : 0;
    const rubricMeetingCount = catScoreList.filter((s) => parseFloat(s.marksObtained || '0') >= 50).length;
    const rubricMeetingRate = catScoreList.length > 0 ? Math.round((rubricMeetingCount / catScoreList.length) * 100) : 0;

    const [invigilationCount] = await db.select({ total: count() }).from(invigilatorAllocations).where(isNull(invigilatorAllocations.deletedAt));
    const [markingCount] = await db.select({ total: count() }).from(markingAllocations).where(isNull(markingAllocations.deletedAt));

    return {
      // Smart Mode & Multiple Exams State
      activeMode,
      isExamPeriodActive,
      selectedExamId: selectedExamId || 'all',
      selectedExamTitle,
      examsList: allExams,

      // Option 3 Exam Lifecycle KPIs
      examSeries: {
        total: allExams.length,
        active: activeExams.length,
        concluded: concludedExams.length,
      },
      sessionProgress: {
        totalSessions,
        completedSessions,
        completionRate,
      },
      marksSubmission: {
        totalExpected,
        submittedCount,
        submissionRate: marksSubmissionRate,
      },
      dosVerification: {
        totalSubmitted: submittedCount,
        verifiedCount,
        pendingCount,
        correctionCount,
        verificationRate: dosVerificationRate,
      },
      reportRelease: {
        totalClasses: totalClassesCount,
        lockedClasses: activeLocksCount,
        readinessRate: reportReleaseReadiness,
      },

      // CATs Mode Metrics (Occupies and surfaces CATs when active)
      catsMetrics: {
        activeCatAssessments: catList.length,
        catsClassCoverageRate,
        catScoresCount: catScoreList.length,
        rubricMeetingRate,
        catsAverage,
      },

      // School Academic Mean & Baseline Totals
      schoolAverage,
      totalScoresEntered: scores.length,
      schoolName: settings?.schoolName || 'Eldoret Muslim Academy',
      academicYear: settings?.currentAcademicYear || 2026,
      currentTermNumber: currentTerm?.termNumber || 1,

      // Legacy fallback fields for backward compatibility
      totalExams: allExams.length,
      publishedExams: activeExams.length,
      scheduledSessions: totalSessions,
      invigilationsCount: invigilationCount?.total || 0,
      markingCount: markingCount?.total || 0,
      totalReportLocks: locksCount?.total || 0,
      activeLocksCount,
      releasedReportsCount: (locksCount?.total || 0) - activeLocksCount,
    };
  }
}
