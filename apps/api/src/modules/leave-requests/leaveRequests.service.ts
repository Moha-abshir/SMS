import { db } from '../../config/db.js';
import { teacherLeaveRequests, users, systemSettings, eq, isNull, desc } from '@school/shared';

export class LeaveRequestsService {
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

    // Fetch teachers list to map standing in teachers
    const allUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users);
    const usersMap = new Map(allUsers.map((u) => [u.id, u]));

    return list.map((item) => {
      let parsedNotes: any = {};
      try {
        if (item.request.notes && item.request.notes.startsWith('{')) {
          parsedNotes = JSON.parse(item.request.notes);
        }
      } catch (e) {}

      const standingInId = (item.request as any).standingInTeacherId || parsedNotes.standingInTeacherId;
      const standingInTeacher = standingInId ? usersMap.get(standingInId) : null;

      return {
        ...item,
        standingInTeacher,
        departureTime: (item.request as any).departureTime || parsedNotes.departureTime || '08:00 AM',
        duration: (item.request as any).duration || parsedNotes.duration || '1 day',
        reasons: parsedNotes.reasons || [item.request.reason],
        deputyReason: (item.request as any).deputyReason || parsedNotes.deputyReason || 'Approved',
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

    const [settings] = await db.select().from(systemSettings).limit(1);

    const reasons = parsedNotes.reasons && parsedNotes.reasons.length > 0
      ? parsedNotes.reasons
      : [request.leave.reason];

    return {
      leave: request.leave,
      teacher: request.teacher,
      standingInTeacher,
      departureTime: (request.leave as any).departureTime || parsedNotes.departureTime || '08:00 AM',
      duration: (request.leave as any).duration || parsedNotes.duration || '1 day',
      reasons,
      deputyReason: (request.leave as any).deputyReason || parsedNotes.deputyReason || 'Approved',
      settings: settings || {
        schoolName: 'Eldoret Muslim Academy',
        postalAddress: 'P.O BOX 5080-30100',
        city: 'ELDORET.',
      },
    };
  }
}
