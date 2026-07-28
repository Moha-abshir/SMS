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
}
