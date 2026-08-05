import crypto from 'crypto';
import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, invitations, roles, eq, or, and, ne, inArray } from '@school/shared';
import { EmailService } from '../../services/email.service.js';

export class InvitationsService {
  /**
   * Generates a 32-byte secure random hex token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a token using Argon2 for secure storage
   */
  static async hashToken(token: string): Promise<string> {
    return await argon2.hash(token);
  }

  /**
   * Compares a raw token with a hash
   */
  static async verifyToken(token: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, token);
    } catch {
      return false;
    }
  }

  /**
   * Checks if email, phone, or nationalId are already in use by active users or pending invitations
   */
  static async checkUniqueness(email: string, phone: string, nationalId: string, tscNumber?: string) {
    // 1. Check active/inactive Users table
    const existingUser = await db.query.users.findFirst({
      where: (users, { or, eq }) => {
        const conditions = [
          eq(users.email, email.toLowerCase()),
          eq(users.phoneNumber, phone),
          eq(users.nationalId, nationalId)
        ];
        if (tscNumber) conditions.push(eq(users.tscNumber, tscNumber));
        return or(...conditions);
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) throw new Error('Email is already registered.');
      if (existingUser.phoneNumber === phone) throw new Error('Phone number is already registered.');
      if (existingUser.nationalId === nationalId) throw new Error('National ID is already registered.');
      if (tscNumber && existingUser.tscNumber === tscNumber) throw new Error('TSC Number is already registered.');
    }

    // 2. Check pending/accepted Invitations table
    const existingInvitation = await db.query.invitations.findFirst({
      where: (invs, { or, eq, inArray }) => {
        const conditions = [
          eq(invs.email, email.toLowerCase()),
          eq(invs.phoneNumber, phone),
          eq(invs.nationalId, nationalId)
        ];
        if (tscNumber) conditions.push(eq(invs.tscNumber, tscNumber));
        
        return and(
          or(...conditions),
          inArray(invs.status, ['PENDING', 'ACCEPTED'])
        );
      }
    });

    if (existingInvitation) {
      if (existingInvitation.email === email.toLowerCase()) throw new Error('An active invitation with this email already exists.');
      if (existingInvitation.phoneNumber === phone) throw new Error('An active invitation with this phone number already exists.');
      if (existingInvitation.nationalId === nationalId) throw new Error('An active invitation with this National ID already exists.');
      if (tscNumber && existingInvitation.tscNumber === tscNumber) throw new Error('An active invitation with this TSC Number already exists.');
    }
  }

  /**
   * Creates a new staff invitation
   */
  static async createInvitation(data: any, invitedById: string, frontendUrl: string) {
    // 1. Validate TSC Number if role is teaching-related
    const roleRecord = await db.query.roles.findFirst({
      where: eq(roles.id, data.roleId)
    });
    if (!roleRecord) throw new Error('Invalid Role ID');

    const teachingRoles = ['TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD'];
    if (teachingRoles.includes(roleRecord.name) && !data.tscNumber) {
      throw new Error('TSC Number is strictly required for teaching roles.');
    }

    // 2. Enforce uniqueness
    await this.checkUniqueness(data.email, data.phoneNumber, data.nationalId, data.tscNumber);

    // 3. Generate token and hash
    const rawToken = this.generateToken();
    const tokenHash = await this.hashToken(rawToken);

    // 4. Calculate expiry (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 5. Insert Invitation
    const [newInvitation] = await db.insert(invitations).values({
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      email: data.email.toLowerCase(),
      phoneNumber: data.phoneNumber,
      nationalId: data.nationalId,
      tscNumber: data.tscNumber || null,
      address: data.address || null,
      salaryAmount: data.salaryAmount ? data.salaryAmount.toString() : null,
      salaryPaymentDay: data.salaryPaymentDay || null,
      roleId: data.roleId,
      invitedBy: invitedById,
      invitationTokenHash: tokenHash,
      expiresAt,
      status: 'PENDING'
    }).returning();

    // 6. Send Email
    const inviteUrl = `${frontendUrl}/accept-invitation?email=${encodeURIComponent(newInvitation.email)}&token=${rawToken}`;
    const emailSent = await EmailService.sendInvitationEmail(
      newInvitation.email,
      newInvitation.firstName,
      roleRecord.name,
      inviteUrl,
      expiresAt.toLocaleString()
    );

    return { invitation: newInvitation, emailSent };
  }

  /**
   * Resends an invitation (generates new token, updates expiry)
   */
  static async resendInvitation(invitationId: string, frontendUrl: string) {
    const inv = await db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId),
      with: { role: true } // We need role name for the email. Wait, relational queries might not be setup.
    });

    if (!inv) throw new Error('Invitation not found');
    if (inv.status === 'ACCEPTED') throw new Error('Invitation has already been accepted');
    if (inv.status === 'CANCELLED') throw new Error('Cannot resend a cancelled invitation');

    // Manually fetch role if 'with' fails
    const roleRecord = await db.query.roles.findFirst({ where: eq(roles.id, inv.roleId) });

    const rawToken = this.generateToken();
    const tokenHash = await this.hashToken(rawToken);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.update(invitations)
      .set({
        invitationTokenHash: tokenHash,
        expiresAt,
        status: 'PENDING',
        updatedAt: new Date()
      })
      .where(eq(invitations.id, invitationId));

    const inviteUrl = `${frontendUrl}/accept-invitation?email=${encodeURIComponent(inv.email)}&token=${rawToken}`;
    const emailSent = await EmailService.sendInvitationEmail(
      inv.email,
      inv.firstName,
      roleRecord?.name || 'Staff Member',
      inviteUrl,
      expiresAt.toLocaleString()
    );

    return { success: true, emailSent };
  }

  /**
   * Cancels an invitation
   */
  static async cancelInvitation(invitationId: string) {
    const inv = await db.query.invitations.findFirst({ where: eq(invitations.id, invitationId) });
    if (!inv) throw new Error('Invitation not found');
    if (inv.status === 'ACCEPTED') throw new Error('Cannot cancel an accepted invitation');

    await db.update(invitations)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(invitations.id, invitationId));

    return { success: true };
  }

  /**
   * Validates an invitation token (Readonly Check)
   */
  static async validateInvitation(email: string, rawToken: string) {
    const inv = await db.query.invitations.findFirst({
      where: eq(invitations.email, email.toLowerCase())
    });

    if (!inv) throw new Error('Invitation not found');
    if (inv.status === 'ACCEPTED') throw new Error('Invitation has already been accepted');
    if (inv.status === 'CANCELLED') throw new Error('This invitation has been cancelled');
    if (new Date() > inv.expiresAt) {
      await db.update(invitations).set({ status: 'EXPIRED' }).where(eq(invitations.id, inv.id));
      throw new Error('This invitation has expired');
    }

    const isValid = await this.verifyToken(rawToken, inv.invitationTokenHash);
    if (!isValid) throw new Error('Invalid or corrupted invitation token');

    const roleRecord = await db.query.roles.findFirst({ where: eq(roles.id, inv.roleId) });

    return {
      firstName: inv.firstName,
      lastName: inv.lastName,
      email: inv.email,
      roleName: roleRecord?.name || ''
    };
  }

  /**
   * Accepts an invitation and creates the user account
   */
  static async acceptInvitation(email: string, rawToken: string, passwordPlain: string) {
    // 1. Validate the invitation completely
    const inv = await db.query.invitations.findFirst({
      where: eq(invitations.email, email.toLowerCase())
    });

    if (!inv) throw new Error('Invitation not found');
    if (inv.status === 'ACCEPTED') throw new Error('Invitation has already been accepted');
    if (inv.status === 'CANCELLED') throw new Error('This invitation has been cancelled');
    if (new Date() > inv.expiresAt) throw new Error('This invitation has expired');

    const isValid = await this.verifyToken(rawToken, inv.invitationTokenHash);
    if (!isValid) throw new Error('Invalid invitation token');

    // 2. Hash Password
    const passwordHash = await argon2.hash(passwordPlain);

    // 3. Create User record
    const [newUser] = await db.insert(users).values({
      firstName: inv.firstName,
      lastName: inv.lastName,
      middleName: inv.middleName,
      email: inv.email,
      phoneNumber: inv.phoneNumber,
      nationalId: inv.nationalId,
      tscNumber: inv.tscNumber,
      address: inv.address,
      salaryAmount: inv.salaryAmount,
      salaryPaymentDay: inv.salaryPaymentDay,
      roleId: inv.roleId,
      passwordHash,
      isActive: true, // User is active upon acceptance
      dateOfEmployment: new Date(), // Set employment date to today
    }).returning();

    // 4. Mark Invitation as Accepted
    await db.update(invitations).set({
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      invitationTokenHash: 'CONSUMED', // Destroy the hash
      updatedAt: new Date()
    }).where(eq(invitations.id, inv.id));

    return newUser;
  }
}
