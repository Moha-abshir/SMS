import { db } from '../../config/db.js';
import { teacherLeaveRequests, users, classes, roles, systemSettings, eq, and, isNull, desc } from '@school/shared';

export class LeaveRequestsService {
  static async getFormData() {
    // 1. Fetch active teachers and staff with their roles
    const teachersList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        roleId: users.roleId,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
      .orderBy(users.firstName, users.lastName);

    // 2. Fetch all classes with assigned class teacher details
    const classesList = await db
      .select({
        id: classes.id,
        name: classes.name,
        levelCategory: classes.levelCategory,
        classTeacherId: classes.classTeacherId,
        classTeacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    return {
      teachers: teachersList,
      classes: classesList,
    };
  }

  static async getLeaveRequests() {
    const list = await db
      .select({
        request: teacherLeaveRequests,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(teacherLeaveRequests)
      .innerJoin(users, eq(teacherLeaveRequests.teacherId, users.id))
      .where(isNull(teacherLeaveRequests.deletedAt))
      .orderBy(desc(teacherLeaveRequests.createdAt));

    // Fetch teachers and classes to map standing-in teachers and class teacher assignments
    const [allUsers, allClasses] = await Promise.all([
      db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users),
      db.select({ id: classes.id, name: classes.name, classTeacherId: classes.classTeacherId }).from(classes).where(isNull(classes.deletedAt)),
    ]);
    const usersMap = new Map(allUsers.map((u) => [u.id, u]));
    const classTeacherMap = new Map<string, { id: string; name: string }>();
    for (const c of allClasses) {
      if (c.classTeacherId) {
        classTeacherMap.set(c.classTeacherId, { id: c.id, name: c.name });
      }
    }

    return list.map((item) => {
      let parsedNotes: any = {};
      try {
        if (item.request.notes && item.request.notes.startsWith('{')) {
          parsedNotes = JSON.parse(item.request.notes);
        }
      } catch (e) {}

      const standingInId = (item.request as any).standingInTeacherId || parsedNotes.standingInTeacherId;
      const standingInTeacher = standingInId ? usersMap.get(standingInId) : null;
      const isReturned = Boolean(parsedNotes.isReturned);
      const returnedAt = parsedNotes.returnedAt || null;
      const classTeacherOf = classTeacherMap.get(item.teacher.id) || null;

      return {
        ...item,
        standingInTeacher,
        departureTime: (item.request as any).departureTime || parsedNotes.departureTime || '08:00 AM',
        duration: (item.request as any).duration || parsedNotes.duration || '1 day',
        reasons: parsedNotes.reasons || [item.request.reason],
        deputyReason: (item.request as any).deputyReason || parsedNotes.deputyReason || 'Approved',
        isReturned,
        returnedAt,
        classTeacherOf,
      };
    });
  }

  static async createLeaveRequest(data: {
    teacherId: string;
    leaveType?: string;
    startDate: string;
    endDate?: string;
    departureTime?: string;
    duration?: string;
    standingInTeacherId?: string;
    reason: string;
    reasons?: string[];
    deputyReason?: string;
    notes?: string;
  }, createdById: string) {
    const reasonsList = data.reasons && data.reasons.length > 0
      ? data.reasons.filter(Boolean)
      : [data.reason];

    const notesPayload = JSON.stringify({
      departureTime: data.departureTime || '08:00 AM',
      duration: data.duration || '1 day',
      standingInTeacherId: data.standingInTeacherId || null,
      reasons: reasonsList,
      deputyReason: data.deputyReason || 'Approved',
      customNotes: data.notes || '',
    });

    const [created] = await db
      .insert(teacherLeaveRequests)
      .values({
        teacherId: data.teacherId,
        leaveType: data.leaveType || 'PERSONAL',
        startDate: data.startDate,
        endDate: data.endDate || data.startDate,
        reason: reasonsList.join('; '),
        notes: notesPayload,
        status: 'APPROVED', // Deputy recording or approving leave
        approvedById: createdById,
        approvedAt: new Date(),
      })
      .returning();

    return created;
  }

  static async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED', approvedById: string, notes?: string) {
    const [updated] = await db
      .update(teacherLeaveRequests)
      .set({
        status,
        approvedById,
        approvedAt: new Date(),
        notes,
        updatedAt: new Date(),
      })
      .where(eq(teacherLeaveRequests.id, id))
      .returning();

    return updated;
  }

  static async markReportedBack(id: string, reportedById: string) {
    const [request] = await db
      .select()
      .from(teacherLeaveRequests)
      .where(eq(teacherLeaveRequests.id, id));

    if (!request) throw new Error('Leave request not found');

    let parsedNotes: any = {};
    try {
      if (request.notes && request.notes.startsWith('{')) {
        parsedNotes = JSON.parse(request.notes);
      }
    } catch (e) {}

    parsedNotes.isReturned = true;
    parsedNotes.returnedAt = new Date().toISOString();
    parsedNotes.returnedRecordedById = reportedById;

    const [updated] = await db
      .update(teacherLeaveRequests)
      .set({
        notes: JSON.stringify(parsedNotes),
        updatedAt: new Date(),
      })
      .where(eq(teacherLeaveRequests.id, id))
      .returning();

    return updated;
  }

  static async getActiveStandInDelegationForTeacher(userId: string) {
    const approvedRequests = await db
      .select({
        request: teacherLeaveRequests,
        originalTeacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(teacherLeaveRequests)
      .innerJoin(users, eq(teacherLeaveRequests.teacherId, users.id))
      .where(
        and(
          eq(teacherLeaveRequests.status, 'APPROVED'),
          isNull(teacherLeaveRequests.deletedAt)
        )
      )
      .orderBy(desc(teacherLeaveRequests.createdAt));

    for (const item of approvedRequests) {
      let parsedNotes: any = {};
      try {
        if (item.request.notes && item.request.notes.startsWith('{')) {
          parsedNotes = JSON.parse(item.request.notes);
        }
      } catch (e) {}

      const standingInId = (item.request as any).standingInTeacherId || parsedNotes.standingInTeacherId;
      const isReturned = Boolean(parsedNotes.isReturned);

      if (standingInId === userId && !isReturned) {
        const [assignedClass] = await db
          .select()
          .from(classes)
          .where(
            and(
              eq(classes.classTeacherId, item.originalTeacher.id),
              isNull(classes.deletedAt)
            )
          );

        if (assignedClass) {
          return {
            assignedClass,
            originalTeacher: item.originalTeacher,
            leaveRequestId: item.request.id,
            departureTime: (item.request as any).departureTime || parsedNotes.departureTime,
            duration: (item.request as any).duration || parsedNotes.duration,
          };
        }
      }
    }

    return null;
  }

  static async isEffectiveClassTeacher(userId: string, classId: string): Promise<boolean> {
    const [cls] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)));

    if (!cls) return false;
    if (cls.classTeacherId === userId) return true;

    const delegation = await this.getActiveStandInDelegationForTeacher(userId);
    if (delegation && delegation.assignedClass.id === classId) {
      return true;
    }

    return false;
  }

  static async getLeaveSlipPrintData(id: string) {
    const [request] = await db
      .select({
        leave: teacherLeaveRequests,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(teacherLeaveRequests)
      .innerJoin(users, eq(teacherLeaveRequests.teacherId, users.id))
      .where(eq(teacherLeaveRequests.id, id));

    if (!request) throw new Error('Leave request not found');

    let parsedNotes: any = {};
    try {
      if (request.leave.notes && request.leave.notes.startsWith('{')) {
        parsedNotes = JSON.parse(request.leave.notes);
      }
    } catch (e) {}

    let standingInTeacher: any = null;
    const standingInId = (request.leave as any).standingInTeacherId || parsedNotes.standingInTeacherId;
    if (standingInId) {
      const [st] = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, standingInId));
      standingInTeacher = st || null;
    }

    // Check if teacher is class teacher of any class
    const [assignedClass] = await db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(and(eq(classes.classTeacherId, request.teacher.id), isNull(classes.deletedAt)));

    const [settings] = await db.select().from(systemSettings).limit(1);

    const reasons = parsedNotes.reasons && parsedNotes.reasons.length > 0
      ? parsedNotes.reasons
      : [request.leave.reason];

    const departureTime = (request.leave as any).departureTime || parsedNotes.departureTime || '08:00 AM';
    const duration = (request.leave as any).duration || parsedNotes.duration || '1 day';
    const deputyReason = (request.leave as any).deputyReason || parsedNotes.deputyReason || 'Approved';

    const requestData = {
      ...request.leave,
      departureTime,
      duration,
      reasons,
      deputyReason,
    };

    return {
      leave: request.leave,
      request: requestData,
      teacher: request.teacher,
      standingInTeacher,
      departureTime,
      duration,
      reasons,
      deputyReason,
      isReturned: Boolean(parsedNotes.isReturned),
      returnedAt: parsedNotes.returnedAt || null,
      classTeacherOf: assignedClass || null,
      settings: settings || {
        schoolName: 'Eldoret Muslim Academy',
        postalAddress: 'P.O BOX 5080-30100',
        city: 'ELDORET.',
      },
    };
  }
}
