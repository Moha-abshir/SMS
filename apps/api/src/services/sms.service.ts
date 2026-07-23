import { env } from '../config/env';

export class SmsService {
  static async sendAbsenceAlert(toPhone: string, studentName: string, consecutiveDays: number): Promise<boolean> {
    const message = `Dear Guardian, ${studentName} has been absent from school for ${consecutiveDays} consecutive day(s). Please contact the Deputy Head Teacher immediately.`;

    if (!env.AFRICAS_TALKING_API_KEY) {
      console.log(`[Africa's Talking Log Fallback] SMS to ${toPhone}: ${message}`);
      return true;
    }

    try {
      const url = env.AFRICAS_TALKING_USERNAME === 'sandbox' 
        ? 'https://api.sandbox.africastalking.com/version1/messaging' 
        : 'https://api.africastalking.com/version1/messaging';

      const body = new URLSearchParams({
        username: env.AFRICAS_TALKING_USERNAME,
        to: toPhone,
        message: message,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': env.AFRICAS_TALKING_API_KEY,
        },
        body: body.toString(),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Africa\'s Talking SMS:', error);
      return false;
    }
  }
}
