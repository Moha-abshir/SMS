import { env } from '../config/env.js';

export class EmailService {
  static async sendOtpEmail(toEmail: string, recipientName: string, otp: string): Promise<boolean> {
    if (!env.BREVO_API_KEY) {
      console.log(`[Brevo Log Fallback] 2FA OTP for ${toEmail}: ${otp}`);
      return true;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'School Management System', email: env.BREVO_SENDER_EMAIL },
          to: [{ email: toEmail, name: recipientName }],
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
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Brevo API Error] Status ${response.status}:`, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Brevo Error] Failed to send OTP email:', error);
      return false;
    }
  }

  static async sendInvitationEmail(toEmail: string, recipientName: string, roleName: string, inviteUrl: string, expiryDate: string): Promise<boolean> {
    if (!env.BREVO_API_KEY) {
      console.log(`[Brevo Log Fallback] Invitation Link for ${toEmail}: ${inviteUrl}`);
      return true;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'School Management System', email: env.BREVO_SENDER_EMAIL },
          to: [{ email: toEmail, name: recipientName }],
          subject: 'You have been invited to join the School Management System',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
              <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
                <h2 style="color: #2563EB; margin-top: 0;">School Management System</h2>
                <p>Hello ${recipientName},</p>
                <p>You have been invited to join the system as a <strong>${roleName.replace('_', ' ')}</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
                </div>
                <p style="color: #64748B; font-size: 13px;">This personal invitation link will expire on ${expiryDate}. Do not share this link with anyone.</p>
                <p style="color: #64748B; font-size: 13px;">If you cannot click the button, copy and paste this URL into your browser:</p>
                <p style="color: #64748B; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Brevo API Error] Status ${response.status}:`, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Brevo Error] Failed to send Invitation email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(toEmail: string, recipientName: string, resetUrl: string, expiryMinutes: number): Promise<boolean> {
    if (!env.BREVO_API_KEY) {
      console.log(`[Brevo Log Fallback] Password Reset Link for ${toEmail}: ${resetUrl}`);
      return true;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'School Management System', email: env.BREVO_SENDER_EMAIL },
          to: [{ email: toEmail, name: recipientName }],
          subject: 'Password Reset Requested',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A; background-color: #F8FAFC;">
              <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
                <h2 style="color: #2563EB; margin-top: 0;">School Account Security</h2>
                <p>Hello ${recipientName},</p>
                <p>A password reset was initiated for your School Management System account by an authorized administrator.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #64748B; font-size: 13px;">This secure reset link will expire in <strong>${expiryMinutes} minutes</strong>. Do not share this link with anyone.</p>
                <p style="color: #64748B; font-size: 13px;">If you cannot click the button, copy and paste this URL into your browser:</p>
                <p style="color: #64748B; font-size: 12px; word-break: break-all;">${resetUrl}</p>
                <p style="color: #DC2626; font-size: 12px; margin-top: 20px;">If you did not expect this request, please contact your Head Teacher immediately.</p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Brevo API Error] Status ${response.status}:`, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Brevo Error] Failed to send Password Reset email:', error);
      return false;
    }
  }

  static async sendPasswordResetConfirmationEmail(toEmail: string, recipientName: string): Promise<boolean> {
    if (!env.BREVO_API_KEY) {
      console.log(`[Brevo Log Fallback] Password Reset Confirmation for ${toEmail}`);
      return true;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'School Management System', email: env.BREVO_SENDER_EMAIL },
          to: [{ email: toEmail, name: recipientName }],
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
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Brevo Error] Failed to send Password Confirmation email:', error);
      return false;
    }
  }

  static async send2FaResetNotificationEmail(toEmail: string, recipientName: string): Promise<boolean> {
    if (!env.BREVO_API_KEY) {
      console.log(`[Brevo Log Fallback] 2FA Reset Notification for ${toEmail}`);
      return true;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'School Management System', email: env.BREVO_SENDER_EMAIL },
          to: [{ email: toEmail, name: recipientName }],
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
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Brevo Error] Failed to send 2FA Reset notification email:', error);
      return false;
    }
  }
}
