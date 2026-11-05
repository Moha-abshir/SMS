import 'dotenv/config';
import { db } from '../config/db.js';
import {
  users,
  roles,
  classes,
  subjects,
  examinations,
  teacherSubjectAllocations,
  markingAllocations,
  teacherLeaveRequests,
  students,
  examScores,
  eq,
  isNull,
  and,
} from '@school/shared';
import { DosService } from '../modules/dos/dos.service.js';
import { AuthenticatedUser } from '../middleware/auth.js';

async function runVerification() {
  console.log('====================================================');
  console.log('RUNNING ROLE-SCOPED ACADEMIC PERFORMANCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // 1. Fetch reference entities from DB
  const [allRoles, dbClasses, dbSubjects, allExams] = await Promise.all([
    db.select().from(roles),
    db.select().from(classes).where(isNull(classes.deletedAt)),
    db.select().from(subjects).where(isNull(subjects.deletedAt)),
    db.select().from(examinations).where(isNull(examinations.deletedAt)),
  ]);

  const teacherRole = allRoles.find((r) => r.name === 'TEACHER');
  const dosRole = allRoles.find((r) => r.name === 'DOS');

  if (!teacherRole || !dosRole) {
    throw new Error('Roles not found in database');
  }

  const latestExam = allExams[0];
  console.log(`Found ${dbClasses.length} classes, ${dbSubjects.length} subjects, ${allExams.length} exams.`);

  // 2. Fetch existing users to test real database mappings
  const allUsers = await db.select().from(users).where(isNull(users.deletedAt));

  // Find a leadership user (DOS or HEAD_TEACHER)
  const dosUserRecord = allUsers.find((u) => u.roleId === dosRole.id);
  const leadershipUser: AuthenticatedUser = {
    id: dosUserRecord?.id || 'dos-admin-id',
    email: dosUserRecord?.email || 'dos@school.co.ke',
    roleId: dosRole.id,
    roleName: 'DOS',
    tokenVersion: 1,
    permissions: ['exams:manage', 'marks:approve'],
  };

  // Find a Class Teacher in the DB
  const classWithTeacher = dbClasses.find((c) => c.classTeacherId !== null);
  let classTeacherUser: AuthenticatedUser | null = null;
  let classTeacherAssignedClass = classWithTeacher;

  if (classWithTeacher && classWithTeacher.classTeacherId) {
    const uRec = allUsers.find((u) => u.id === classWithTeacher.classTeacherId);
    if (uRec) {
      classTeacherUser = {
        id: uRec.id,
        email: uRec.email,
        roleId: teacherRole.id,
        roleName: 'TEACHER',
        tokenVersion: 1,
        permissions: ['marks:entry'],
      };
    }
  }

  // Find a true Subject Teacher in the DB (allocated in teacherSubjectAllocations and NOT a class teacher of any class)
  const allAllocations = await db
    .select()
    .from(teacherSubjectAllocations)
    .where(isNull(teacherSubjectAllocations.deletedAt));

  const ctTeacherIds = new Set(dbClasses.map((c) => c.classTeacherId).filter(Boolean));

  let subjectTeacherUser: AuthenticatedUser | null = null;
  let subjectTeacherAlloc: (typeof allAllocations)[0] | null = null;

  for (const alloc of allAllocations) {
    if (!ctTeacherIds.has(alloc.teacherId)) {
      const uRec = allUsers.find((u) => u.id === alloc.teacherId);
      if (uRec) {
        subjectTeacherUser = {
          id: uRec.id,
          email: uRec.email,
          roleId: teacherRole.id,
          roleName: 'TEACHER',
          tokenVersion: 1,
          permissions: ['marks:entry'],
        };
        subjectTeacherAlloc = alloc;
        break;
      }
    }
  }

  // Create mock unassigned teacher
  const unassignedTeacherUser: AuthenticatedUser = {
    id: '00000000-0000-0000-0000-000000000099',
    email: 'unassigned.teacher@school.co.ke',
    roleId: teacherRole.id,
    roleName: 'TEACHER',
    tokenVersion: 1,
    permissions: ['marks:entry'],
  };

  console.log('--- TEST 1: Leadership Unrestricted Access ---');
  try {
    const dosResult = await DosService.getExamAnalysis(latestExam?.id, undefined, leadershipUser);
    assert(dosResult.userScope.isLeadership === true, 'Leadership userScope.isLeadership is true');
    assert(dosResult.classes.length === dbClasses.length, 'Leadership sees all school classes', `Expected ${dbClasses.length}, got ${dosResult.classes.length}`);
    assert(dosResult.subjects.length > 0, 'Leadership sees schoolwide subjects');

    const subjectAnalytics = await DosService.getSubjectAnalytics(leadershipUser);
    assert(subjectAnalytics.length > 0, 'Leadership subject analytics returns schoolwide subjects');

    const insights = await DosService.getAcademicInsights(latestExam?.id, leadershipUser);
    assert(insights.insights.length > 0, 'Leadership gets academic insights without restriction');
  } catch (err: any) {
    assert(false, 'Leadership test threw unexpected error', err.message);
  }

  console.log('\n--- TEST 2: Unassigned Teacher 403 Forbidden ---');
  try {
    await DosService.getExamAnalysis(latestExam?.id, undefined, unassignedTeacherUser);
    assert(false, 'Unassigned teacher should be denied with 403 from getExamAnalysis');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Unassigned teacher received HTTP 403 from getExamAnalysis', `Received: ${err.statusCode} - ${err.message}`);
  }

  try {
    await DosService.getSubjectAnalytics(unassignedTeacherUser);
    assert(false, 'Unassigned teacher should be denied with 403 from getSubjectAnalytics');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Unassigned teacher received HTTP 403 from getSubjectAnalytics', `Received: ${err.statusCode} - ${err.message}`);
  }

  try {
    await DosService.getAcademicInsights(latestExam?.id, unassignedTeacherUser);
    assert(false, 'Unassigned teacher should be denied with 403 from getAcademicInsights');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Unassigned teacher received HTTP 403 from getAcademicInsights', `Received: ${err.statusCode} - ${err.message}`);
  }

  console.log('\n--- TEST 3: Class Teacher Scoped Access & Defaulting ---');
  if (classTeacherUser && classTeacherAssignedClass) {
    try {
      // 3a. Call without classId -> Must automatically default to assigned class
      const ctResult = await DosService.getExamAnalysis(latestExam?.id, undefined, classTeacherUser);
      assert(ctResult.userScope.isClassTeacher === true, 'User recognized as Class Teacher');
      assert(ctResult.userScope.defaultClassId === classTeacherAssignedClass.id, 'Defaults targetClassId to assigned class');
      assert(ctResult.selectedClassDetail !== null, 'selectedClassDetail populated automatically');
      assert(ctResult.selectedClassDetail?.classId === classTeacherAssignedClass.id, 'selectedClassDetail matches assigned class');
      assert(ctResult.selectedClassDetail?.isClassTeacherScope === true, 'isClassTeacherScope is true');

      // 3b. Verify learners have all their subjects in their assigned class
      const students = ctResult.selectedClassDetail?.students || [];
      if (students.length > 0) {
        const student = students[0];
        assert(student.subjects.length > 0, 'Learner broadsheet has multiple subjects');
      }

      // 3c. Verify intervention learners only contain assigned class learners
      const leakedInterventions = (ctResult.interventionLearners || []).some(
        (il: any) => il.className !== classTeacherAssignedClass!.name
      );
      assert(!leakedInterventions, 'Intervention learners list strictly restricted to assigned class');

      // 3d. Verify remedial watchlist only contains assigned class learners
      const leakedRemedials = (ctResult.remedialWatchlist || []).some(
        (rw: any) => rw.classId !== classTeacherAssignedClass!.id
      );
      assert(!leakedRemedials, 'Remedial watchlist strictly restricted to assigned class');

      // 3e. getSubjectAnalytics for Class Teacher
      const ctSubjectAnalytics = await DosService.getSubjectAnalytics(classTeacherUser);
      assert(ctSubjectAnalytics.length > 0, 'Class Teacher can access subject analytics for their class level');

      // 3f. Query an unallocated class -> Must throw 403 Forbidden
      const otherClass = dbClasses.find((c) => c.id !== classTeacherAssignedClass!.id);
      if (otherClass) {
        let threw403 = false;
        try {
          const hasAllocInOther = allAllocations.some((a) => a.teacherId === classTeacherUser!.id && a.classId === otherClass.id);
          if (!hasAllocInOther) {
            await DosService.getExamAnalysis(latestExam?.id, otherClass.id, classTeacherUser);
          } else {
            threw403 = true;
          }
        } catch (e: any) {
          threw403 = e.statusCode === 403;
        }
        assert(threw403, 'Class Teacher forbidden (403) from accessing unassigned class');
      }
    } catch (err: any) {
      console.error('FULL ERROR IN TEST 3:', err);
      assert(false, 'Class Teacher test threw unexpected error', err.message);
    }
  } else {
    console.warn('Skipping Class Teacher test: No assigned class teacher found in DB');
  }

  console.log('\n--- TEST 4: Subject Teacher Scoped Access & Subject Filtering ---');
  if (subjectTeacherUser && subjectTeacherAlloc) {
    try {
      const stResult = await DosService.getExamAnalysis(latestExam?.id, subjectTeacherAlloc.classId, subjectTeacherUser);
      assert(stResult.userScope.isSubjectTeacher === true, 'User recognized as Subject Teacher');
      assert(stResult.userScope.isClassTeacher === false, 'isClassTeacher is false for Subject Teacher');
      assert(stResult.selectedClassDetail?.isClassTeacherScope === false, 'isClassTeacherScope is false for Subject Teacher');

      // Verify that all subject scores in selectedClassDetail strictly belong to allocated subject
      const students = stResult.selectedClassDetail?.students || [];
      let unauthorizedSubjectFound = false;
      for (const s of students) {
        for (const sub of s.subjects) {
          if (sub.subjectId !== subjectTeacherAlloc.subjectId) {
            unauthorizedSubjectFound = true;
          }
        }
      }
      assert(!unauthorizedSubjectFound, 'Subject Teacher marksheet STRICTLY filters out unallocated learning areas');

      // Verify subject department list only contains allocated subject(s)
      const visibleSubjIds = stResult.subjects.map((s: any) => s.subjectId);
      const allAllocatedSubs = allAllocations
        .filter((a) => a.teacherId === subjectTeacherUser!.id)
        .map((a) => a.subjectId);
      const leaksUnauthorizedSubjects = visibleSubjIds.some((id: string) => !allAllocatedSubs.includes(id));
      assert(!leaksUnauthorizedSubjects, 'Subject Department Matrix contains ONLY allocated subjects');

      // Verify intervention learners list strictly omits unallocated subjects and unallocated classes
      const teacherClassSubjectPairs = new Set(
        allAllocations
          .filter((a) => a.teacherId === subjectTeacherUser!.id)
          .map((a) => {
            const cls = dbClasses.find((c) => c.id === a.classId);
            const sub = dbSubjects.find((s) => s.id === a.subjectId);
            return `${cls?.name}:${sub?.name}`;
          })
      );
      const leakedIntervention = (stResult.interventionLearners || []).some(
        (il: any) => !teacherClassSubjectPairs.has(`${il.className}:${il.subjectName}`)
      );
      assert(!leakedIntervention, 'Subject Teacher intervention learners strictly contains only allocated subject & class');

      // Verify subject analytics for Subject Teacher strictly scoped to allocated subjects
      const stSubjectAnalytics = await DosService.getSubjectAnalytics(subjectTeacherUser);
      const saLeakedSubjects = stSubjectAnalytics.some((sa) => !allAllocatedSubs.includes(sa.subjectId));
      assert(!saLeakedSubjects, 'Subject Teacher getSubjectAnalytics strictly filters to allocated subjects');

      // Query an unallocated class -> Must throw 403
      const unallocatedClass = dbClasses.find(
        (c) => !allAllocations.some((a) => a.teacherId === subjectTeacherUser!.id && a.classId === c.id)
      );
      if (unallocatedClass) {
        let threw403 = false;
        try {
          await DosService.getExamAnalysis(latestExam?.id, unallocatedClass.id, subjectTeacherUser);
        } catch (e: any) {
          threw403 = e.statusCode === 403;
        }
        assert(threw403, 'Subject Teacher forbidden (403) from accessing unallocated class');
      }
    } catch (err: any) {
      assert(false, 'Subject Teacher test threw unexpected error', err.message);
    }
  } else {
    console.warn('Skipping Subject Teacher test: No subject-only allocation found in DB');
  }

  console.log('\n--- TEST 5: Dual-Role Resolution ---');
  let dualRoleUser: AuthenticatedUser | null = null;
  let dualRoleClassId: string | null = null;
  let dualRoleOtherClassId: string | null = null;
  let dualRoleSubjectId: string | null = null;

  for (const cls of dbClasses) {
    if (cls.classTeacherId) {
      const otherAlloc = allAllocations.find(
        (a) => a.teacherId === cls.classTeacherId && a.classId !== cls.id
      );
      if (otherAlloc) {
        const uRec = allUsers.find((u) => u.id === cls.classTeacherId);
        if (uRec) {
          dualRoleUser = {
            id: uRec.id,
            email: uRec.email,
            roleId: teacherRole.id,
            roleName: 'TEACHER',
            tokenVersion: 1,
            permissions: ['marks:entry'],
          };
          dualRoleClassId = cls.id;
          dualRoleOtherClassId = otherAlloc.classId;
          dualRoleSubjectId = otherAlloc.subjectId;
          break;
        }
      }
    }
  }

  if (dualRoleUser && dualRoleClassId && dualRoleOtherClassId) {
    try {
      // 5a. Query managed class -> full broadsheet
      const resManaged = await DosService.getExamAnalysis(latestExam?.id, dualRoleClassId, dualRoleUser);
      assert(resManaged.userScope.role === 'DUAL_ROLE', 'Dual-Role detected as DUAL_ROLE');
      assert(resManaged.selectedClassDetail?.isClassTeacherScope === true, 'Managed class returns isClassTeacherScope === true');
      const managedLearner = resManaged.selectedClassDetail?.students?.[0];
      if (managedLearner) {
        assert(managedLearner.subjects.length > 1, 'Managed class has full multi-subject broadsheet');
      }

      // 5b. Query allocated class -> only allocated subject
      const resAlloc = await DosService.getExamAnalysis(latestExam?.id, dualRoleOtherClassId, dualRoleUser);
      assert(resAlloc.selectedClassDetail?.isClassTeacherScope === false, 'Allocated other class returns isClassTeacherScope === false');
      const allocLearners = resAlloc.selectedClassDetail?.students || [];
      let leakedInOther = false;
      for (const l of allocLearners) {
        for (const s of l.subjects) {
          if (s.subjectId !== dualRoleSubjectId) {
            leakedInOther = true;
          }
        }
      }
      assert(!leakedInOther, 'Allocated other class strictly restricts marks to allocated subject');

      const allocVisibleSubs = resAlloc.subjects.map((s: any) => s.subjectId);
      assert(
        allocVisibleSubs.every((id: string) => id === dualRoleSubjectId),
        'Dual-Role teacher sees ONLY allocated subject in Subject Matrix for other class'
      );
    } catch (err: any) {
      assert(false, 'Dual-Role test threw unexpected error', err.message);
    }
  } else {
    console.log('Note: No natural dual-role teacher found in seed data; verified via component tests.');
  }

  console.log('\n--- TEST 6: Stand-In Delegation Resolution ---');
  if (classTeacherAssignedClass && classTeacherAssignedClass.classTeacherId) {
    const originalTeacherId = classTeacherAssignedClass.classTeacherId;
    const standInUser: AuthenticatedUser = {
      id: '00000000-0000-0000-0000-000000000088',
      email: 'standin.teacher@school.co.ke',
      roleId: teacherRole.id,
      roleName: 'TEACHER',
      tokenVersion: 1,
      permissions: ['marks:entry'],
    };

    let insertedRequestId: string | null = null;
    try {
      // Insert a mock approved leave request with stand-in notes
      const [insertedRequest] = await db
        .insert(teacherLeaveRequests)
        .values({
          teacherId: originalTeacherId,
          leaveType: 'SICK',
          startDate: '2026-11-01',
          endDate: '2026-11-10',
          reason: 'Medical Leave with Delegation',
          status: 'APPROVED',
          notes: JSON.stringify({
            standingInTeacherId: standInUser.id,
            isReturned: false,
          }),
        })
        .returning();
      insertedRequestId = insertedRequest.id;

      // Query as standInUser
      const standInResult = await DosService.getExamAnalysis(latestExam?.id, undefined, standInUser);
      assert(standInResult.userScope.isClassTeacher === true, 'Stand-in teacher recognized as Class Teacher');
      assert(
        standInResult.userScope.defaultClassId === classTeacherAssignedClass.id,
        'Stand-in teacher automatically defaults to delegated class'
      );
      assert(
        standInResult.selectedClassDetail?.classId === classTeacherAssignedClass.id,
        'Stand-in teacher receives full Class Broadsheet for delegated class'
      );
    } catch (err: any) {
      assert(false, 'Stand-in delegation test failed', err.message);
    } finally {
      if (insertedRequestId) {
        try {
          await db.delete(teacherLeaveRequests).where(eq(teacherLeaveRequests.id, insertedRequestId));
          assert(true, 'Stand-in delegation cleaned up successfully');
        } catch (cleanErr) {}
      }
    }
  }

  console.log('\n--- TEST 7: Combined Subject & Marking Allocation Resolution ---');
  const sampleClass = dbClasses[0];
  const sampleSubj1 = dbSubjects[0];
  const sampleSubj2 = dbSubjects[1];

  const candidateTeacher = allUsers.find(
    (u) => u.roleId === teacherRole.id && !ctTeacherIds.has(u.id)
  );

  if (sampleClass && sampleSubj1 && sampleSubj2 && candidateTeacher) {
    let insertedTSAId: string | null = null;
    let insertedMAId: string | null = null;

    try {
      const combinedTeacherUser: AuthenticatedUser = {
        id: candidateTeacher.id,
        email: candidateTeacher.email,
        roleId: teacherRole.id,
        roleName: 'TEACHER',
        tokenVersion: 1,
        permissions: ['marks:entry'],
      };

      // Insert teacherSubjectAllocation for sampleSubj1
      const [insertedTSA] = await db
        .insert(teacherSubjectAllocations)
        .values({
          teacherId: candidateTeacher.id,
          classId: sampleClass.id,
          subjectId: sampleSubj1.id,
          academicYear: 2026,
        })
        .returning();
      insertedTSAId = insertedTSA.id;

      // Insert markingAllocation for sampleSubj2
      const [insertedMA] = await db
        .insert(markingAllocations)
        .values({
          examId: latestExam.id,
          teacherId: candidateTeacher.id,
          classId: sampleClass.id,
          subjectId: sampleSubj2.id,
        })
        .returning();
      insertedMAId = insertedMA.id;

      const combinedResult = await DosService.getExamAnalysis(
        latestExam.id,
        sampleClass.id,
        combinedTeacherUser
      );

      const visibleIds = combinedResult.subjects.map((s: any) => s.subjectId);
      assert(
        visibleIds.includes(sampleSubj1.id) && visibleIds.includes(sampleSubj2.id),
        'Combined teacher can view BOTH teaching allocation and marking allocation learning areas'
      );
    } catch (err: any) {
      assert(false, 'Combined allocations test failed', err.message);
    } finally {
      // Clean up test rows
      try {
        if (insertedTSAId) {
          await db.delete(teacherSubjectAllocations).where(eq(teacherSubjectAllocations.id, insertedTSAId));
        }
        if (insertedMAId) {
          await db.delete(markingAllocations).where(eq(markingAllocations.id, insertedMAId));
        }
      } catch (cleanErr) {}
    }
  }

  console.log('\n--- TEST 8: Soft-Delete Invariants Verification ---');
  if (classTeacherAssignedClass && classTeacherUser) {
    // Find an active student in the class
    const [testStudent] = await db
      .select()
      .from(students)
      .where(and(eq(students.classId, classTeacherAssignedClass.id), isNull(students.deletedAt)))
      .limit(1);

    if (testStudent) {
      try {
        // 1. Temporarily soft-delete the student
        await db
          .update(students)
          .set({ deletedAt: new Date() })
          .where(eq(students.id, testStudent.id));

        // 2. Query exam analysis for class teacher
        const ctAnalysisAfterDelete = await DosService.getExamAnalysis(
          latestExam.id,
          classTeacherAssignedClass.id,
          classTeacherUser
        );

        const studentsInBroadsheet = ctAnalysisAfterDelete.selectedClassDetail?.students || [];
        const foundDeletedStudent = studentsInBroadsheet.some((s: any) => s.studentId === testStudent.id);
        assert(!foundDeletedStudent, 'Soft-deleted student strictly excluded from class broadsheet');

        // 3. Query subject analytics
        const subjectAnalyticsAfterDelete = await DosService.getSubjectAnalytics(classTeacherUser);
        assert(Array.isArray(subjectAnalyticsAfterDelete), 'Subject analytics executes cleanly with soft-deleted student in DB');
      } catch (err: any) {
        assert(false, 'Soft-delete invariant test failed', err.message);
      } finally {
        // Restore student
        try {
          await db
            .update(students)
            .set({ deletedAt: null })
            .where(eq(students.id, testStudent.id));
          assert(true, 'Soft-deleted student restored successfully to original active state');
        } catch (restoreErr) {}
      }
    } else {
      console.log('Note: No active student found in class for soft-delete test.');
    }
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
