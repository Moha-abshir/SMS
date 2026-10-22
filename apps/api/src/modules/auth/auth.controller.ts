import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { users, roles, loginSchema, verifyOtpSchema, eq } from '@school/shared';
import { EmailService } from '../../services/email.service.js';
import { ROLE_DEFAULT_PERMISSIONS } from '../../middleware/auth.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.parse(req.body);

      // Find user
      const userList = await db.select().from(users).where(eq(users.email, parsed.email.toLowerCase()));
      if (userList.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email address or password' });
      }

      const user = userList[0];
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Head Teacher.' });
      }

      // Verify argon2 password hash
      const isValidPassword = await argon2.verify(user.passwordHash, parsed.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid email address or password' });
      }

      // Generate 6-digit 2FA OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await db.update(users)
        .set({ twoFactorOtp: otp, twoFactorExpiresAt: expiresAt })
        .where(eq(users.id, user.id));

      console.log('\n' + '═'.repeat(64));
      console.log('🔐 [2FA AUTHENTICATION CODE GENERATED]');
      console.log(`📧 User:      ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`🔑 OTP CODE:  >>> ${otp} <<<`);
      console.log(`⏳ Expires:   5 minutes`);
      console.log('═'.repeat(64) + '\n');

      // Send Brevo OTP Email
      const emailSent = await EmailService.sendOtpEmail(user.email, `${user.firstName} ${user.lastName}`, otp);

      return res.status(200).json({
        success: true,
        message: 'Credentials verified. 2FA OTP code has been sent to your email.',
        requires2FA: true,
        email: user.email,
        emailSent,
        devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
      }
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async verify2FA(req: Request, res: Response) {
    try {
      const parsed = verifyOtpSchema.parse(req.body);

      const userList = await db.select().from(users).where(eq(users.email, parsed.email.toLowerCase()));
      if (userList.length === 0) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      const user = userList[0];
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Head Teacher.' });
      }

      if (!user.twoFactorOtp || !user.twoFactorExpiresAt) {
        return res.status(400).json({ success: false, message: 'No pending 2FA session. Please log in again.' });
      }

      if (new Date() > new Date(user.twoFactorExpiresAt)) {
        await db.update(users)
          .set({ twoFactorOtp: null, twoFactorExpiresAt: null })
          .where(eq(users.id, user.id));
        return res.status(400).json({ success: false, message: '2FA verification code has expired (5-minute limit). Please request a new code.' });
      }

      if (user.twoFactorOtp !== parsed.otp) {
        return res.status(401).json({ success: false, message: 'Incorrect 2FA verification code' });
      }

      // Fetch user's role
      const roleList = await db.select().from(roles).where(eq(roles.id, user.roleId));
      const roleName = roleList[0]?.name || 'STAFF';

      // Clear OTP, reset twoFactorResetRequired flag & update lastLoginAt
      await db.update(users)
        .set({ twoFactorOtp: null, twoFactorExpiresAt: null, twoFactorResetRequired: false, lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      const payload = {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: roleName,
        tokenVersion: user.tokenVersion,
        permissions: ROLE_DEFAULT_PERMISSIONS[roleName] || [],
      };

      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        tokens: { accessToken: token },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: roleName,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
      }
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async resendOtp(req: Request, res: Response) {
    try {
      const email = req.body.email;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const userList = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (userList.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userList[0];
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      // Generate 6-digit 2FA OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await db.update(users)
        .set({ twoFactorOtp: otp, twoFactorExpiresAt: expiresAt })
        .where(eq(users.id, user.id));

      console.log('\n' + '═'.repeat(64));
      console.log('🔐 [2FA CODE RESENT]');
      console.log(`📧 User:      ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`🔑 OTP CODE:  >>> ${otp} <<<`);
      console.log(`⏳ Expires:   5 minutes`);
      console.log('═'.repeat(64) + '\n');

      // Send Brevo OTP Email
      const emailSent = await EmailService.sendOtpEmail(user.email, `${user.firstName} ${user.lastName}`, otp);

      return res.status(200).json({
        success: true,
        message: 'A new 2FA OTP code has been sent to your email.',
        emailSent,
        devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      });
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
