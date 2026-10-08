import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, roles, classes, eq, and, desc, invitations, ne, sql, subjects, userSubjects, invitationSubjects, inArray, isNull, isNotNull } from '@school/shared';
import { invalidateUserSessionCache } from '../../middleware/auth.js';

let cachedRoles: { id: string; name: string }[] | null = null;
let rolesCachedAt = 0;

export class StaffService {
  static async getAllRoles() {
    const now = Date.now();
    if (cachedRoles && (now - rolesCachedAt < 600000)) { // 10 minutes cache
      return cachedRoles;
    }
    const rolesList = await db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(desc(roles.createdAt));
    cachedRoles = rolesList;
    rolesCachedAt = now;
    return rolesList;
  }

  static async getAllStaff() {
    const [staffList, invitationList, allUserSubjects, allInvSubjects, allAssignedClasses] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          middleName: users.middleName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
          nationalId: users.nationalId,
          address: users.address,
          tscNumber: users.tscNumber,
          dateOfEmployment: users.dateOfEmployment,
          salaryAmount: users.salaryAmount,
          salaryPaymentDay: users.salaryPaymentDay,
          isActive: users.isActive,
          twoFactorResetRequired: users.twoFactorResetRequired,
          lastLoginAt: users.lastLoginAt,
          roleId: users.roleId,
          roleName: roles.name,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .orderBy(desc(users.createdAt)),

      db
        .select({
          id: invitations.id,
          email: invitations.email,
          firstName: invitations.firstName,
          middleName: invitations.middleName,
          lastName: invitations.lastName,
          phoneNumber: invitations.phoneNumber,
          nationalId: invitations.nationalId,
          address: invitations.address,
          tscNumber: invitations.tscNumber,
          dateOfEmployment: sql<Date | null>`null`.as('dateOfEmployment'),
          salaryAmount: invitations.salaryAmount,
          salaryPaymentDay: invitations.salaryPaymentDay,
          isActive: sql<boolean>`false`.as('isActive'),
          twoFactorResetRequired: sql<boolean>`false`.as('twoFactorResetRequired'),
          lastLoginAt: sql<Date | null>`null`.as('lastLoginAt'),
          roleId: invitations.roleId,
          roleName: roles.name,
          invitationStatus: invitations.status,
          expiresAt: invitations.expiresAt,
          createdAt: invitations.createdAt,
        })
        .from(invitations)
        .innerJoin(roles, eq(invitations.roleId, roles.id))
        .where(ne(invitations.status, 'ACCEPTED'))
        .orderBy(desc(invitations.createdAt)),

      db
        .select({
          userId: userSubjects.userId,
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
        })
        .from(userSubjects)
        .innerJoin(subjects, eq(userSubjects.subjectId, subjects.id)),

      db
        .select({
          invitationId: invitationSubjects.invitationId,
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
        })
        .from(invitationSubjects)
        .innerJoin(subjects, eq(invitationSubjects.subjectId, subjects.id)),

      db
        .select({
          id: classes.id,
          name: classes.name,
          classTeacherId: classes.classTeacherId,
        })
        .from(classes)
        .where(and(isNotNull(classes.classTeacherId), isNull(classes.deletedAt))),
    ]);

    // Group user subjects by userId
    const userSubMap = new Map<string, { id: string; name: string; code: string }[]>();
    for (const us of allUserSubjects) {
      if (!userSubMap.has(us.userId)) userSubMap.set(us.userId, []);
      userSubMap.get(us.userId)!.push({ id: us.subjectId, name: us.subjectName, code: us.subjectCode });
    }

    // Group invitation subjects by invitationId
    const invSubMap = new Map<string, { id: string; name: string; code: string }[]>();
    for (const isub of allInvSubjects) {
      if (!invSubMap.has(isub.invitationId)) invSubMap.set(isub.invitationId, []);
      invSubMap.get(isub.invitationId)!.push({ id: isub.subjectId, name: isub.subjectName, code: isub.subjectCode });
    }

    // Group classes by classTeacherId
    const classTeacherMap = new Map<string, { id: string; name: string }[]>();
    for (const c of allAssignedClasses) {
      if (c.classTeacherId) {
        if (!classTeacherMap.has(c.classTeacherId)) classTeacherMap.set(c.classTeacherId, []);
        classTeacherMap.get(c.classTeacherId)!.push({ id: c.id, name: c.name });
      }
    }

    // Map both lists to a unified format
    const unifiedStaff = [
      ...staffList.map(s => ({
        ...s,
        isInvitation: false,
        invitationStatus: null,
        qualifiedSubjects: userSubMap.get(s.id) || [],
        assignedSubjects: userSubMap.get(s.id) || [],
        classTeacherFor: classTeacherMap.get(s.id) || [],
      })),
      ...invitationList.map(i => {
        const isExpired = i.invitationStatus === 'PENDING' && i.expiresAt && new Date() > new Date(i.expiresAt);
        return {
          ...i,
          isInvitation: true,
          invitationStatus: isExpired ? 'EXPIRED' : i.invitationStatus,
          qualifiedSubjects: invSubMap.get(i.id) || [],
          assignedSubjects: invSubMap.get(i.id) || [],
          classTeacherFor: [],
        };
      })
    ];

    return unifiedStaff;
  }

  static async updateStaff(id: string, data: any) {
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      phoneNumber: data.phoneNumber,
      nationalId: data.nationalId,
      address: data.address || null,
      tscNumber: data.tscNumber || null,
      roleId: data.roleId,
      salaryAmount: data.salaryAmount ? data.salaryAmount.toString() : null,
      salaryPaymentDay: data.salaryPaymentDay ? parseInt(data.salaryPaymentDay) : null,
      dateOfEmployment: data.dateOfEmployment ? new Date(data.dateOfEmployment) : null,
      updatedAt: new Date(),
    };
    
    if (data.email) {
      updateData.email = data.email.toLowerCase();
    }

    const updatedStaff = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    // Update user subjects if subjectIds array is provided
    if (Array.isArray(data.subjectIds)) {
      await db.delete(userSubjects).where(eq(userSubjects.userId, id));
      if (data.subjectIds.length > 0) {
        await db.insert(userSubjects).values(
          data.subjectIds.map((subId: string) => ({
            userId: id,
            subjectId: subId,
          }))
        );
      }
    }

    return updatedStaff[0];
  }

  static async toggleStatus(id: string, isActive: boolean) {
    if (!isActive) {
      // Check if user is currently assigned as class teacher
      const assignedClasses = await db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(and(eq(classes.classTeacherId, id), isNull(classes.deletedAt)));

      if (assignedClasses.length > 0) {
        const classNames = assignedClasses.map(c => c.name).join(', ');
        const error: any = new Error(
          `Cannot deactivate staff member. This teacher is currently assigned as the Class Teacher for ${classNames}. Please contact the Deputy Head Teacher to unassign or reassign them before deactivating.`
        );
        error.code = 'CANNOT_DEACTIVATE_CLASS_TEACHER';
        error.assignedClasses = assignedClasses;
        throw error;
      }
    }

    const updatedStaff = await db.update(users)
      .set({
        isActive,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    invalidateUserSessionCache(id);
    return updatedStaff[0];
  }

  static async resetPassword(id: string) {
    const defaultPassword = 'Password123!';
    const passwordHash = await argon2.hash(defaultPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
    return defaultPassword;
  }
}
