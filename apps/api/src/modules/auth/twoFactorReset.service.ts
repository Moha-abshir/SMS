import argon2 from 'argon2';
import { db } from '../../config/db.js';
import { users, eq } from '@school/shared';
import { EmailService } from '../../services/email.service.js';
import { AuditService } from '../../services/audit.service.js';
import { invalidateUserSessionCache } from '../../middleware/auth.js';

export class TwoFactorResetService {
  /**
   * Initiates a 2FA reset for a staff member (Head Teacher Initiated)
   * Requires Head Teacher password re-authentication for high-security authorization.
   */
  static async initiate2FaReset(targetUserId: string, adminUserId: string, adminPasswordConfirm: string) {
    // 1. Verify Head Teacher credentials
    const [adminUser] = await db.select().from(users).where(eq(users.id, adminUserId));
    if (!adminUser) throw new Error('Administrator session not found.');
    
    if (!adminPasswordConfirm) {
      throw new Error('Administrator password re-authentication is required to confirm 2FA reset.');
    }

    const isValidAdminPassword = await argon2.verify(adminUser.passwordHash, adminPasswordConfirm);
    if (!isValidAdminPassword) {
      throw new Error('Incorrect administrator password. 2FA reset authorization denied.');
    }

    // 2. Fetch target user
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!targetUser) throw new Error('Target staff member not found.');
    if (!targetUser.isActive) throw new Error('Cannot reset 2FA for a deactivated staff member.');

    // 3. Update 2FA state and revoke active sessions
    await db.update(users).set({
      twoFactorResetRequired: true,
      twoFactorOtp: null,
      twoFactorExpiresAt: null,
      tokenVersion: targetUser.tokenVersion + 1, // Instantly revokes all active JWT sessions
      updatedAt: new Date(),
    }).where(eq(users.id, targetUser.id));

    invalidateUserSessionCache(targetUser.id);

    // 4. Audit Log
    await AuditService.log({
      actorId: adminUser.id,
      action: 'ADMIN_INITIATED_2FA_RESET',
      entityName: 'users',
      entityId: targetUser.id,
      userIdentifier: adminUser.email,
    });

    // 5. Send notification email to staff member
    const recipientName = `${targetUser.firstName} ${targetUser.lastName}`;
    const emailSent = await EmailService.send2FaResetNotificationEmail(targetUser.email, recipientName);

    return { success: true, emailSent, email: targetUser.email };
  }
}
