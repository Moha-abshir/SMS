import { db } from '../../config/db.js';
import { teacherLeaveRequests, users, systemSettings, eq, isNull, desc } from '@school/shared';

export class LeaveRequestsService {
  static async getLeaveRequests() {
    return await db
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
  }

  static async createLeaveRequest(data: {
    teacherId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
  }, createdById: string) {
    const [created] = await db
      .insert(teacherLeaveRequests)
      .values({
        teacherId: data.teacherId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        notes: data.notes,
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
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(teacherLeaveRequests)
      .innerJoin(users, eq(teacherLeaveRequests.teacherId, users.id))
      .where(eq(teacherLeaveRequests.id, id));

    const [settings] = await db.select().from(systemSettings).limit(1);

    if (!request) throw new Error('Leave request not found');

    return {
      leave: request.leave,
      teacher: request.teacher,
      settings: settings || {
        schoolName: 'Eldoret Muslim Academy',
        schoolMotto: 'Excellence in Knowledge & Virtue',
      },
    };
  }
}
