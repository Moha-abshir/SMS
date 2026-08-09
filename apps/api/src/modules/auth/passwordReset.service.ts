import crypto from 'crypto';
import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, passwordResetTokens, eq, and, isNull } from '@school/shared';
import { EmailService } from '../../services/email.service.js';
import { AuditService } from '../../services/audit.service.js';
import { invalidateUserSessionCache } from '../../middleware/auth.js';

export class PasswordResetService {
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
   * Compares a raw token with an Argon2 hash
   */
  static async verifyToken(token: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, token);
    } catch {
      return false;
    }
  }

  /**
   * Initiates a password reset process for a staff member (Head Teacher Initiated)
   */
  static async initiatePasswordReset(targetUserId: string, adminUser: any, frontendUrl: string) {
    // 1. Fetch target user
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!targetUser) throw new Error('Target staff member not found.');
    if (!targetUser.isActive) throw new Error('Cannot initiate password reset for a deactivated staff member.');

    // 2. Generate secure token & Argon2 hash
    const rawToken = this.generateToken();
    const tokenHash = await this.hashToken(rawToken);

    // 3. Expiration: 60 minutes
    const expiryMinutes = 60;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 4. Store token hash in database
    await db.insert(passwordResetTokens).values({
      userId: targetUser.id,
      tokenHash,
      expiresAt,
      createdBy: adminUser.id,
    });

    // 5. Send Brevo Email
    const resetUrl = `${frontendUrl}/reset-password?email=${encodeURIComponent(targetUser.email)}&token=${rawToken}`;
    const recipientName = `${targetUser.firstName} ${targetUser.lastName}`;
    const emailSent = await EmailService.sendPasswordResetEmail(targetUser.email, recipientName, resetUrl, expiryMinutes);

    // 6. Audit Log
    await AuditService.log({
      actorId: adminUser.id,
      action: 'ADMIN_INITIATED_PASSWORD_RESET',
      entityName: 'users',
      entityId: targetUser.id,
      userIdentifier: adminUser.email,
    });

    return { success: true, emailSent, email: targetUser.email };
  }

  /**
   * Validates a password reset token (Read-Only Check)
   */
  static async validateToken(email: string, rawToken: string) {
    const [targetUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!targetUser) throw new Error('Invalid password reset link.');
    if (!targetUser.isActive) throw new Error('User account is deactivated.');

    // Fetch active unused tokens for this user
    const activeTokens = await db.select().from(passwordResetTokens).where(
      and(
        eq(passwordResetTokens.userId, targetUser.id),
        isNull(passwordResetTokens.usedAt)
      )
    );

    let matchingTokenRecord = null;
    for (const record of activeTokens) {
      if (new Date() > record.expiresAt) continue; // Expired
      const isValid = await this.verifyToken(rawToken, record.tokenHash);
      if (isValid) {
        matchingTokenRecord = record;
        break;
      }
    }

    if (!matchingTokenRecord) {
      throw new Error('This password reset link is invalid or has expired.');
    }

    return {
      userId: targetUser.id,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
    };
  }

  /**
   * Completes a password reset process by setting the new password
   */
  static async completePasswordReset(email: string, rawToken: string, passwordPlain: string) {
    const [targetUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!targetUser) throw new Error('Invalid password reset link.');
    if (!targetUser.isActive) throw new Error('User account is deactivated.');

    // Find and verify matching token
    const activeTokens = await db.select().from(passwordResetTokens).where(
      and(
        eq(passwordResetTokens.userId, targetUser.id),
        isNull(passwordResetTokens.usedAt)
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
      throw new Error('This password reset link is invalid or has expired.');
    }

    // 1. Hash new password
    const newPasswordHash = await argon2.hash(passwordPlain);

    // 2. Update user record (Update passwordHash, increment tokenVersion to revoke all active sessions)
    await db.update(users).set({
      passwordHash: newPasswordHash,
      tokenVersion: targetUser.tokenVersion + 1,
      updatedAt: new Date(),
    }).where(eq(users.id, targetUser.id));

    invalidateUserSessionCache(targetUser.id);

    // 3. Mark token as used
    await db.update(passwordResetTokens).set({
      usedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(passwordResetTokens.id, matchingTokenRecord.id));

    // 4. Audit Log
    await AuditService.log({
      actorId: targetUser.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityName: 'users',
      entityId: targetUser.id,
      userIdentifier: targetUser.email,
    });

    // 5. Send confirmation email
    const recipientName = `${targetUser.firstName} ${targetUser.lastName}`;
    await EmailService.sendPasswordResetConfirmationEmail(targetUser.email, recipientName);

    return { success: true };
  }
}
