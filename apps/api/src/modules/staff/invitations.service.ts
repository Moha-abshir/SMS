import crypto from 'crypto';
import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, invitations, roles, invitationSubjects, userSubjects, eq, or, and, ne, inArray, desc } from '@school/shared';
import { EmailService } from '../../services/email.service.js';

export type InvitationErrorCode =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_INVALID'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_CANCELLED'
  | 'INVITATION_ACCEPTED';

export class InvitationError extends Error {
  code: InvitationErrorCode;
  details?: any;

  constructor(code: InvitationErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'InvitationError';
    this.code = code;
    this.details = details;
  }
}

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

    // 4. Calculate expiry (strictly 60 minutes from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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

    // 5.1 Insert assigned subjects if provided
    if (Array.isArray(data.subjectIds) && data.subjectIds.length > 0) {
      await db.insert(invitationSubjects).values(
        data.subjectIds.map((subId: string) => ({
          invitationId: newInvitation.id,
          subjectId: subId,
        }))
      );
    }

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
   * Resends an invitation (generates new token, strictly 60 minutes expiry)
   */
  static async resendInvitation(invitationId: string, frontendUrl: string) {
    const inv = await db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId)
    });

    if (!inv) throw new InvitationError('INVITATION_NOT_FOUND', 'Invitation not found');
    if (inv.status === 'ACCEPTED') throw new InvitationError('INVITATION_ACCEPTED', 'Invitation has already been accepted');
    if (inv.status === 'CANCELLED') throw new InvitationError('INVITATION_CANCELLED', 'Cannot resend a cancelled invitation');

    // Manually fetch role if 'with' fails
    const roleRecord = await db.query.roles.findFirst({ where: eq(roles.id, inv.roleId) });

    const rawToken = this.generateToken();
    const tokenHash = await this.hashToken(rawToken);
    
    // Strictly 60 minutes from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
    if (!inv) throw new InvitationError('INVITATION_NOT_FOUND', 'Invitation not found');
    if (inv.status === 'ACCEPTED') throw new InvitationError('INVITATION_ACCEPTED', 'Cannot cancel an accepted invitation');

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
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if an active user account already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    // 2. Fetch all invitations for this email (most recent first)
    const userInvs = await db.query.invitations.findMany({
      where: eq(invitations.email, normalizedEmail),
      orderBy: [desc(invitations.createdAt)],
    });

    if (userInvs.length === 0) {
      if (existingUser) {
        throw new InvitationError(
          'INVITATION_ACCEPTED',
          'An active staff account is already registered for this email address. Please proceed to sign in.',
          { email: normalizedEmail }
        );
      }
      throw new InvitationError(
        'INVITATION_NOT_FOUND',
        'No invitation was found for this email address. Please check the link or contact your school administration.',
        { email: normalizedEmail }
      );
    }

    // 3. Find matching invitation by verifying token against hashes
    let matchedInv: typeof userInvs[0] | null = null;
    for (const inv of userInvs) {
      if (inv.invitationTokenHash === 'CONSUMED') continue;
      const isMatch = await this.verifyToken(rawToken, inv.invitationTokenHash);
      if (isMatch) {
        matchedInv = inv;
        break;
      }
    }

    if (!matchedInv) {
      // Check if user already exists or if any invitation was accepted
      const acceptedInv = userInvs.find(i => i.status === 'ACCEPTED');
      if (existingUser || acceptedInv) {
        throw new InvitationError(
          'INVITATION_ACCEPTED',
          'This invitation has already been accepted and your staff account is active. Please proceed to sign in.',
          { email: normalizedEmail, acceptedAt: acceptedInv?.acceptedAt || null }
        );
      }

      // Check if there is a cancelled invitation
      const cancelledInv = userInvs.find(i => i.status === 'CANCELLED');
      if (cancelledInv) {
        throw new InvitationError(
          'INVITATION_CANCELLED',
          'This invitation was cancelled by the Headteacher / School Administration. Please contact your administrator if this is an error.',
          { email: normalizedEmail, cancelledAt: cancelledInv.cancelledAt }
        );
      }

      // Check if there is an expired invitation
      const expiredInv = userInvs.find(i => i.status === 'EXPIRED' || new Date() > new Date(i.expiresAt));
      if (expiredInv) {
        throw new InvitationError(
          'INVITATION_EXPIRED',
          'This invitation link has expired. Invitation links are strictly valid for 60 minutes.',
          { email: normalizedEmail, expiresAt: expiredInv.expiresAt }
        );
      }

      throw new InvitationError(
        'INVITATION_INVALID',
        'Invalid or corrupted invitation link. Please ensure you clicked the complete URL sent to your email.',
        { email: normalizedEmail }
      );
    }

    // 4. Validate status and expiry of the matched invitation
    if (matchedInv.status === 'CANCELLED') {
      throw new InvitationError(
        'INVITATION_CANCELLED',
        'This invitation was cancelled by the Headteacher / School Administration. Please contact your administrator if this is an error.',
        {
          email: normalizedEmail,
          cancelledAt: matchedInv.cancelledAt,
          firstName: matchedInv.firstName,
          lastName: matchedInv.lastName
        }
      );
    }

    if (matchedInv.status === 'ACCEPTED' || existingUser) {
      throw new InvitationError(
        'INVITATION_ACCEPTED',
        'This invitation has already been accepted and your staff account is active. Please proceed to sign in.',
        {
          email: normalizedEmail,
          acceptedAt: matchedInv.acceptedAt,
          firstName: matchedInv.firstName,
          lastName: matchedInv.lastName
        }
      );
    }

    if (matchedInv.status === 'EXPIRED' || new Date() > new Date(matchedInv.expiresAt)) {
      if (matchedInv.status !== 'EXPIRED') {
        await db.update(invitations).set({ status: 'EXPIRED', updatedAt: new Date() }).where(eq(invitations.id, matchedInv.id));
      }
      throw new InvitationError(
        'INVITATION_EXPIRED',
        'This invitation link expired after 60 minutes. Please request a new invitation from your Headteacher.',
        {
          email: normalizedEmail,
          expiresAt: matchedInv.expiresAt,
          firstName: matchedInv.firstName,
          lastName: matchedInv.lastName
        }
      );
    }

    const roleRecord = await db.query.roles.findFirst({ where: eq(roles.id, matchedInv.roleId) });

    return {
      firstName: matchedInv.firstName,
      lastName: matchedInv.lastName,
      email: matchedInv.email,
      roleName: roleRecord?.name || 'Staff Member',
      expiresAt: matchedInv.expiresAt,
    };
  }

  /**
   * Accepts an invitation and creates the user account
   */
  static async acceptInvitation(email: string, rawToken: string, passwordPlain: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch invitations
    const userInvs = await db.query.invitations.findMany({
      where: eq(invitations.email, normalizedEmail),
      orderBy: [desc(invitations.createdAt)]
    });

    if (userInvs.length === 0) {
      throw new InvitationError('INVITATION_NOT_FOUND', 'No invitation found for this email address.');
    }

    let inv: typeof userInvs[0] | null = null;
    for (const candidate of userInvs) {
      if (candidate.invitationTokenHash === 'CONSUMED') continue;
      const isMatch = await this.verifyToken(rawToken, candidate.invitationTokenHash);
      if (isMatch) {
        inv = candidate;
        break;
      }
    }

    if (!inv) {
      const existingUser = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
      if (existingUser) {
        throw new InvitationError(
          'INVITATION_ACCEPTED',
          'This invitation has already been accepted and your staff account is active. Please proceed to sign in.'
        );
      }
      throw new InvitationError('INVITATION_INVALID', 'Invalid or corrupted invitation link.');
    }

    if (inv.status === 'CANCELLED') {
      throw new InvitationError(
        'INVITATION_CANCELLED',
        'This invitation was cancelled by the Headteacher / School Administration. You cannot activate an account using a cancelled invitation.',
        { cancelledAt: inv.cancelledAt }
      );
    }

    if (inv.status === 'ACCEPTED') {
      throw new InvitationError(
        'INVITATION_ACCEPTED',
        'This invitation has already been accepted and your staff account is active. Please proceed to sign in.',
        { acceptedAt: inv.acceptedAt }
      );
    }

    if (inv.status === 'EXPIRED' || new Date() > new Date(inv.expiresAt)) {
      if (inv.status !== 'EXPIRED') {
        await db.update(invitations).set({ status: 'EXPIRED', updatedAt: new Date() }).where(eq(invitations.id, inv.id));
      }
      throw new InvitationError(
        'INVITATION_EXPIRED',
        'This invitation link has expired. Invitation links are strictly valid for 60 minutes.',
        { expiresAt: inv.expiresAt }
      );
    }

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

    // 3.1 Copy invitation subjects to user subjects
    const invSubjectsList = await db
      .select({ subjectId: invitationSubjects.subjectId })
      .from(invitationSubjects)
      .where(eq(invitationSubjects.invitationId, inv.id));

    if (invSubjectsList.length > 0) {
      await db.insert(userSubjects).values(
        invSubjectsList.map(s => ({
          userId: newUser.id,
          subjectId: s.subjectId,
        }))
      );
    }

    // 4. Mark Invitation as Accepted & Consume Hash
    await db.update(invitations).set({
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      invitationTokenHash: 'CONSUMED', // Destroy the hash
      updatedAt: new Date()
    }).where(eq(invitations.id, inv.id));

    return newUser;
  }
}
