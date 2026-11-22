import { db } from '../../config/db.js';
import {
  classes,
  teacherSubjectAllocations,
  eq,
  and,
  isNull,
} from '@school/shared';
import { LeaveRequestsService } from '../leave-requests/leaveRequests.service.js';

/** Teaching ownership is independent of historical examination marking duties. */
export async function teachingScope(userId: string) {
  const [ownedClasses, allocations, delegation] = await Promise.all([
    db
      .select()
      .from(classes)
      .where(
        and(eq(classes.classTeacherId, userId), isNull(classes.deletedAt)),
      ),
    db
      .select({
        classId: teacherSubjectAllocations.classId,
        subjectId: teacherSubjectAllocations.subjectId,
      })
      .from(teacherSubjectAllocations)
      .where(
        and(
          eq(teacherSubjectAllocations.teacherId, userId),
          isNull(teacherSubjectAllocations.deletedAt),
        ),
      ),
    LeaveRequestsService.getActiveStandInDelegationForTeacher(userId),
  ]);
  const managed = new Map(ownedClasses.map((cls) => [cls.id, cls]));
  if (delegation)
    managed.set(delegation.assignedClass.id, delegation.assignedClass);
  return { managedClasses: [...managed.values()], allocations };
}
