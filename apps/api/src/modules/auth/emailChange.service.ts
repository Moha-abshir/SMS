import crypto from 'crypto';
import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, emailChangeTokens, invitations, eq, and, isNull } from '@school/shared';
import { EmailService } from '../../services/email.service.js';
import { AuditService } from '../../services/audit.service.js';
import { invalidateUserSessionCache } from '../../middleware/auth.js';

export class EmailChangeService {
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async hashToken(token: string): Promise<string> {
    return await argon2.hash(token);
  }

  static async verifyToken(token: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, token);
    } catch {
      return false;
    }
  }

  /**
   * Head Teacher initiates email recovery link to NEW email address.
   */
  static async initiateEmailChange(
    targetUserId: string,
    adminUserId: string,
    newEmailInput: string,
    adminPasswordConfirm: string,
    frontendUrl: string
  ) {
    const newEmail = newEmailInput.trim().toLowerCase();

    // 1. Re-authenticate Head Teacher
    const [adminUser] = await db.select().from(users).where(eq(users.id, adminUserId));
    if (!adminUser) throw new Error('Administrator session not found.');
    
    if (!adminPasswordConfirm) {
      throw new Error('Administrator password re-authentication is required to authorize an email change.');
    }

    const isValidAdminPassword = await argon2.verify(adminUser.passwordHash, adminPasswordConfirm);
    if (!isValidAdminPassword) {
      throw new Error('Incorrect administrator password. Authorization denied.');
    }

    // 2. Fetch target user
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!targetUser) throw new Error('Target staff member not found.');
    if (!targetUser.isActive) throw new Error('Cannot change email for a deactivated staff member.');

    if (targetUser.email.toLowerCase() === newEmail) {
      throw new Error('The new email address is identical to the current email address.');
    }

    // 3. ENFORCE EMAIL UNIQUENESS
    const [existingUser] = await db.select().from(users).where(eq(users.email, newEmail));
    if (existingUser) {
      throw new Error(`The email '${newEmail}' is already assigned to another active staff member in the system.`);
    }

    const [existingInvite] = await db.select().from(invitations).where(eq(invitations.email, newEmail));
    if (existingInvite && existingInvite.status === 'PENDING') {
      throw new Error(`The email '${newEmail}' has an active pending invitation.`);
    }

    // 4. Generate secure 32-byte token & Argon2 hash
    const rawToken = this.generateToken();
    const tokenHash = await this.hashToken(rawToken);

    const expiryMinutes = 60;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 5. Store in emailChangeTokens
    await db.insert(emailChangeTokens).values({
      userId: targetUser.id,
      oldEmail: targetUser.email,
      newEmail,
      tokenHash,
      expiresAt,
      createdBy: adminUser.id,
    });

    // 6. Dispatch Brevo verification email to the NEW email address
    const verificationUrl = `${frontendUrl}/verify-email-change?email=${encodeURIComponent(newEmail)}&token=${rawToken}`;
    const recipientName = `${targetUser.firstName} ${targetUser.lastName}`;
    const emailSent = await EmailService.sendEmailChangeVerificationEmail(newEmail, recipientName, targetUser.email, verificationUrl, expiryMinutes);

    // 7. Audit Log
    await AuditService.log({
      actorId: adminUser.id,
      action: 'ADMIN_INITIATED_EMAIL_CHANGE',
      entityName: 'users',
      entityId: targetUser.id,
      oldValues: { email: targetUser.email },
      newValues: { email: newEmail },
      userIdentifier: adminUser.email,
    });

    return { success: true, emailSent, newEmail, oldEmail: targetUser.email };
  }

  /**
   * Validates an email change token (Read-Only Check for verification page load)
   */
  static async validateToken(newEmailInput: string, rawToken: string) {
    const newEmail = newEmailInput.trim().toLowerCase();

    // Fetch active unused email change token records for this newEmail
    const activeTokens = await db.select().from(emailChangeTokens).where(
      and(
        eq(emailChangeTokens.newEmail, newEmail),
        isNull(emailChangeTokens.usedAt)
      )
    );

    let matchingTokenRecord = null;
    for (const record of activeTokens) {
      if (new Date() > record.expiresAt) continue;
      const isValid = await this.verifyToken(rawToken, record.tokenHash);
      if (isValid) {
        matchingTokenRecord = record;
        break;
      }
    }

    if (!matchingTokenRecord) {
      throw new Error('This email change verification link is invalid or has expired.');
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, matchingTokenRecord.userId));
    if (!targetUser) throw new Error('Associated staff member record not found.');

    return {
      userId: targetUser.id,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      oldEmail: matchingTokenRecord.oldEmail,
      newEmail: matchingTokenRecord.newEmail,
    };
  }

  /**
   * Completes email address change when staff member clicks "Verify & Update Email"
   */
  static async completeEmailChange(newEmailInput: string, rawToken: string) {
    const newEmail = newEmailInput.trim().toLowerCase();

    const activeTokens = await db.select().from(emailChangeTokens).where(
      and(
        eq(emailChangeTokens.newEmail, newEmail),
        isNull(emailChangeTokens.usedAt)
      )
    );

    let matchingTokenRecord = null;
    for (const record of activeTokens) {
      if (new Date() > record.expiresAt) continue;
      const isValid = await this.verifyToken(rawToken, record.tokenHash);
      if (isValid) {
        matchingTokenRecord = record;
        break;
      }
    }

    if (!matchingTokenRecord) {
      throw new Error('This email change verification link is invalid or has expired.');
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, matchingTokenRecord.userId));
    if (!targetUser) throw new Error('Associated staff member record not found.');

    // Enforce uniqueness one last time at execution
    const [existingUser] = await db.select().from(users).where(eq(users.email, newEmail));
    if (existingUser && existingUser.id !== targetUser.id) {
      throw new Error(`The email '${newEmail}' is already registered to another active staff member.`);
    }

    // 1. UPDATE EXISTING USER EMAIL & INCREMENT TOKEN VERSION (NO NEW USER CREATED!)
    await db.update(users).set({
      email: newEmail,
      tokenVersion: targetUser.tokenVersion + 1,
      updatedAt: new Date(),
    }).where(eq(users.id, targetUser.id));

    invalidateUserSessionCache(targetUser.id);

    // 2. Mark token as used
    await db.update(emailChangeTokens).set({
      usedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(emailChangeTokens.id, matchingTokenRecord.id));

    // 3. Audit Log
    await AuditService.log({
      actorId: targetUser.id,
      action: 'EMAIL_CHANGE_COMPLETED',
      entityName: 'users',
      entityId: targetUser.id,
      oldValues: { email: matchingTokenRecord.oldEmail },
      newValues: { email: newEmail },
      userIdentifier: newEmail,
    });

    return { success: true, newEmail };
  }
}
