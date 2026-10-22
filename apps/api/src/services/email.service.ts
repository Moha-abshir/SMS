import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export class EmailService {
  private static smtpTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'localhost',
    port: env.SMTP_PORT || 1025,
    secure: false, // true for 465, false for 1025 or other ports
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });

  /**
   * Unified dispatcher: Sends via Brevo API if key is present,
   * otherwise sends via local SMTP (Mailpit) on port 1025 with fallback to console logs.
   */
  private static async sendMail(options: {
    to: string;
    toName: string;
    subject: string;
    htmlContent: string;
  }): Promise<boolean> {
    // 1. If Brevo API Key is configured, use Brevo HTTP API
    if (env.BREVO_API_KEY) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'School Management System', email: env.BREVO_SENDER_EMAIL },
            to: [{ email: options.to, name: options.toName }],
            subject: options.subject,
            htmlContent: options.htmlContent,
          }),
        });

        if (response.ok) {
          return true;
        }
        const errorText = await response.text();
        console.error(`[Brevo API Error] Status ${response.status}:`, errorText);
      } catch (error) {
        console.error('[Brevo Error] Failed to send email via Brevo:', error);
      }
    }

    // 2. Otherwise / fallback: Send via local SMTP (Mailpit at localhost:1025)
    try {
      await this.smtpTransporter.sendMail({
        from: `"School Management System" <${env.BREVO_SENDER_EMAIL || 'noreply@school.test'}>`,
        to: `"${options.toName}" <${options.to}>`,
        subject: options.subject,
        html: options.htmlContent,
      });
      console.log(`[Mailpit SMTP] Email sent to ${options.to}: "${options.subject}" -> View at http://localhost:8025`);
      return true;
    } catch (smtpError: any) {
      console.warn(`[Mailpit SMTP Warning] Could not connect to SMTP server at ${env.SMTP_HOST}:${env.SMTP_PORT} (${smtpError.message}). Fallback to console.`);
      return true;
    }
  }

  static async sendOtpEmail(toEmail: string, recipientName: string, otp: string): Promise<boolean> {
    console.log('\n' + '═'.repeat(64));
    console.log('[2FA LOGIN VERIFICATION CODE]');
    console.log(`Recipient: ${recipientName} <${toEmail}>`);
    console.log(`OTP CODE:  >>> ${otp} <<<`);
    console.log(`Valid For: 5 minutes`);
    console.log('═'.repeat(64) + '\n');
    return this.sendMail({
      to: toEmail,
      toName: recipientName,
      subject: 'Your 2FA Login Verification Code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
          <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="color: #2563EB; margin-top: 0;">School Security Verification</h2>
            <p>Hello ${recipientName},</p>
            <p>Your 2FA verification code to sign into the School Management System is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563EB; text-align: center; margin: 24px 0; padding: 12px; background: #EFF6FF; border-radius: 8px;">
              ${otp}
            </div>
            <p style="color: #64748B; font-size: 13px;">This code will expire in 5 minutes. If you did not attempt to log in, please report this to your Head Teacher immediately.</p>
          </div>
        </div>
      `,
    });
  }

  static async sendInvitationEmail(toEmail: string, recipientName: string, roleName: string, inviteUrl: string, expiryDate: string): Promise<boolean> {
    console.log('\n' + '═'.repeat(64));
    console.log('✉️ [STAFF INVITATION DISPATCHED]');
    console.log(`📧 Recipient: ${recipientName} <${toEmail}>`);
    console.log(`💼 Role:      ${roleName.replace(/_/g, ' ')}`);
    console.log(`🔗 Link:      ${inviteUrl}`);
    console.log(`⏳ Expires:   ${expiryDate}`);
    console.log('═'.repeat(64) + '\n');
    return this.sendMail({
      to: toEmail,
      toName: recipientName,
      subject: 'You have been invited to join the School Management System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
          <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="color: #2563EB; margin-top: 0;">School Management System</h2>
            <p>Hello ${recipientName},</p>
            <p>You have been invited to join the system as a <strong>${roleName.replace(/_/g, ' ')}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="color: #64748B; font-size: 13px;">This personal invitation link is strictly valid for <strong>60 minutes</strong> (expires on ${expiryDate}). Do not share this link with anyone.</p>
            <p style="color: #64748B; font-size: 13px;">If you cannot click the button, copy and paste this URL into your browser:</p>
            <p style="color: #64748B; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
          </div>
        </div>
      `,
    });
  }

  static async sendPasswordResetEmail(toEmail: string, recipientName: string, resetUrl: string, expiryMinutes: number): Promise<boolean> {
    console.log('\n' + '═'.repeat(64));
    console.log('🔑 [PASSWORD RESET LINK DISPATCHED]');
    console.log(`📧 Recipient: ${recipientName} <${toEmail}>`);
    console.log(`🔗 Link:      ${resetUrl}`);
    console.log(`⏳ Valid For: ${expiryMinutes} minutes`);
    console.log('═'.repeat(64) + '\n');
    return this.sendMail({
      to: toEmail,
      toName: recipientName,
      subject: 'Password Reset Requested',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
          <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="color: #2563EB; margin-top: 0;">School Account Security</h2>
            <p>Hello ${recipientName},</p>
            <p>A password reset was requested for your School Management System account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #64748B; font-size: 13px;">This secure reset link will expire in <strong>${expiryMinutes} minutes</strong>. Do not share this link with anyone.</p>
            <p style="color: #64748B; font-size: 13px;">If you cannot click the button, copy and paste this URL into your browser:</p>
            <p style="color: #64748B; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #DC2626; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email or contact your Head Teacher.</p>
          </div>
        </div>
      `,
    });
  }

  static async sendPasswordResetConfirmationEmail(toEmail: string, recipientName: string): Promise<boolean> {
    return this.sendMail({
      to: toEmail,
      toName: recipientName,
      subject: 'Your Password Has Been Changed',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
          <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="color: #059669; margin-top: 0;">Password Successfully Reset</h2>
            <p>Hello ${recipientName},</p>
            <p>Your password for the School Management System has been successfully changed.</p>
            <p style="color: #64748B; font-size: 13px;">All your active sessions have been logged out for security. You will be required to log in with your new password and complete 2FA verification during your next sign-in.</p>
            <p style="color: #DC2626; font-size: 12px; margin-top: 20px;">If you did not perform this change, contact the Head Teacher immediately.</p>
          </div>
        </div>
      `,
    });
  }

  static async send2FaResetNotificationEmail(toEmail: string, recipientName: string): Promise<boolean> {
    return this.sendMail({
      to: toEmail,
      toName: recipientName,
      subject: 'Two-Factor Authentication Reset',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
          <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="color: #D97706; margin-top: 0;">Two-Factor Authentication Reset</h2>
            <p>Hello ${recipientName},</p>
            <p>Your school administrator has reset the two-factor authentication (2FA) configuration for your account.</p>
            <p style="color: #64748B; font-size: 13px;">All existing active sessions have been revoked. When you next sign in with your email and password, a new verification code will be sent to your email to complete verification.</p>
            <p style="color: #DC2626; font-size: 12px; margin-top: 20px;">If this was unexpected, please contact your school administrator immediately.</p>
          </div>
        </div>
      `,
    });
  }

  static async sendEmailChangeVerificationEmail(toNewEmail: string, recipientName: string, oldEmail: string, verificationUrl: string, expiryMinutes: number): Promise<boolean> {
    console.log(`[Email Notification] Email Change Verification Link for ${toNewEmail}: ${verificationUrl}`);
    return this.sendMail({
      to: toNewEmail,
      toName: recipientName,
      subject: 'Verify Your New School Account Email Address',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
          <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="color: #2563EB; margin-top: 0;">Email Address Recovery & Update</h2>
            <p>Hello ${recipientName},</p>
            <p>Your school administrator requested an email address update for your account from <strong>${oldEmail}</strong> to <strong>${toNewEmail}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify & Update Email</a>
            </div>
            <p style="color: #64748B; font-size: 13px;">This verification link will expire in <strong>${expiryMinutes} minutes</strong>. Do not share this link with anyone.</p>
            <p style="color: #64748B; font-size: 13px;">If you cannot click the button, copy and paste this URL into your browser:</p>
            <p style="color: #64748B; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
            <p style="color: #DC2626; font-size: 12px; margin-top: 20px;">If you did not request this email change, please report this to the Head Teacher immediately.</p>
          </div>
        </div>
      `,
    });
  }
}
