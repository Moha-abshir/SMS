import { db } from '../config/db.js';
import { absenceSmsLogs } from '@school/shared';

export class SmsService {
  /**
   * Send SMS via Africa's Talking REST API (or simulated gateway in dev environment)
   */
  static async sendSms(toPhone: string, message: string, studentId: string, guardianId: string) {
    let status: 'SENT' | 'FAILED' = 'SENT';

    try {
      const apiKey = process.env.AFRICASTALKING_API_KEY;
      const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';

      if (apiKey && apiKey !== 'sandbox') {
        // Live Africa's Talking SMS API Call
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('to', toPhone);
        params.append('message', message);

        const response = await fetch('https://api.africastalking.com/version1/messaging', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apiKey': apiKey,
            'Accept': 'application/json',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          status = 'FAILED';
        }
      } else {
        // Development / Sandbox Log Simulation
        console.log(`[SMS SANDBOX] Sending to ${toPhone}: "${message}"`);
        status = 'SENT';
      }
    } catch (err: any) {
      status = 'FAILED';
    }

    // Log SMS delivery to absence_sms_logs
    const [log] = await db
      .insert(absenceSmsLogs)
      .values({
        studentId,
        guardianId,
        phoneNumber: toPhone,
        consecutiveAbsences: 1,
        smsMessage: message,
        status,
      })
      .returning();

    return log;
  }
}
