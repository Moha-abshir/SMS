import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, roles, eq, desc } from '@school/shared';

export class StaffService {
  static async getAllRoles() {
    return await db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(desc(roles.createdAt));
  }

  static async getAllStaff() {
    const staffList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        phoneNumber: users.phoneNumber,
        dateOfEmployment: users.dateOfEmployment,
        salaryAmount: users.salaryAmount,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        roleId: users.roleId,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .orderBy(desc(users.createdAt));
    return staffList;
  }

  static async createStaff(data: any) {
    const defaultPassword = 'Password123!';
    const passwordHash = await argon2.hash(defaultPassword);
    
    const newStaff = await db.insert(users).values({
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      email: data.email.toLowerCase(),
      phoneNumber: data.phoneNumber,
      roleId: data.roleId,
      salaryAmount: data.salaryAmount ? data.salaryAmount.toString() : null,
      dateOfEmployment: data.dateOfEmployment ? new Date(data.dateOfEmployment) : null,
      passwordHash,
    }).returning();
    
    return { staff: newStaff[0], defaultPassword };
  }

  static async updateStaff(id: string, data: any) {
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      phoneNumber: data.phoneNumber,
      roleId: data.roleId,
      salaryAmount: data.salaryAmount ? data.salaryAmount.toString() : null,
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
    return updatedStaff[0];
  }

  static async toggleStatus(id: string, isActive: boolean) {
    const updatedStaff = await db.update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedStaff[0];
  }

  static async resetPassword(id: string) {
    const defaultPassword = 'Password123!';
    const passwordHash = await argon2.hash(defaultPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
    return defaultPassword;
  }
}
