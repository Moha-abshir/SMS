import { db } from '../config/db.js';
import { absenceSmsLogs } from '@school/shared';

export class SmsService {
  /**
   * Normalize Kenyan phone number to E.164 international format (+254...)
   * Examples:
   *  - "0714731331" -> "+254714731331"
   *  - "0114731331" -> "+254114731331"
   *  - "254714731331" -> "+254714731331"
   *  - "+254714731331" -> "+254714731331"
   *  - "714731331" -> "+254714731331"
   */
  static formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.trim().replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    }

    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '254' + cleaned.slice(1);
    } else if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }

    return '+' + cleaned;
  }

  /**
   * Send SMS via Africa's Talking REST API (or fail with clear error if unconfigured)
   */
  static async sendSms(toPhone: string, message: string, studentId: string, guardianId: string) {
    const rawApiKey = process.env.AFRICAS_TALKING_API_KEY || process.env.AFRICASTALKING_API_KEY;
    const apiKey = (rawApiKey || '').trim();
    const username = (process.env.AFRICAS_TALKING_USERNAME || process.env.AFRICASTALKING_USERNAME || 'sandbox').trim();
    const senderId = (process.env.AFRICAS_TALKING_SENDER_ID || process.env.AFRICASTALKING_SENDER_ID || process.env.AFRICASTALKING_FROM || '').trim();

    const formattedPhone = this.formatPhoneNumber(toPhone);

    if (!formattedPhone || formattedPhone.length < 10) {
      await db.insert(absenceSmsLogs).values({
        studentId,
        guardianId,
        phoneNumber: toPhone || 'UNKNOWN',
        consecutiveAbsences: 1,
        smsMessage: message,
        status: 'FAILED',
      });
      throw new Error(`Invalid recipient phone number: "${toPhone}". Must be a valid Kenyan mobile number (e.g. 0714731331).`);
    }

    // Check if API credentials are provided
    if (!apiKey) {
      console.warn(`[SmsService] No Africa's Talking API key configured in server environment.`);
      await db.insert(absenceSmsLogs).values({
        studentId,
        guardianId,
        phoneNumber: formattedPhone,
        consecutiveAbsences: 1,
        smsMessage: message,
        status: 'FAILED',
      });
      throw new Error("Africa's Talking SMS API key not configured. Please set AFRICAS_TALKING_API_KEY and AFRICAS_TALKING_USERNAME in your backend environment variables.");
    }

    const isSandbox = username.toLowerCase() === 'sandbox';
    const endpoint = isSandbox
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    let deliveryStatus: 'SENT' | 'FAILED' = 'FAILED';
    let failureReason: string | null = null;

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('to', formattedPhone);
      params.append('message', message);

      if (senderId && !isSandbox) {
        params.append('from', senderId);
      }

      console.log(`[SmsService] Dispatching SMS to ${formattedPhone} via Africa's Talking (${isSandbox ? 'sandbox' : 'production'})`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': apiKey,
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const resText = await response.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(resText);
      } catch {
        resJson = null;
      }

      console.log(`[SmsService Response HTTP ${response.status}]:`, resText);

      if (!response.ok) {
        const errorMsg = resJson?.errorMessage || resJson?.message || `Africa's Talking HTTP ${response.status}: ${resText}`;
        failureReason = errorMsg;
        deliveryStatus = 'FAILED';
      } else {
        const recipients = resJson?.SMSMessageData?.Recipients || [];
        const recipient = recipients[0];

        if (!recipient) {
          failureReason = resJson?.SMSMessageData?.Message || 'No recipient returned by SMS gateway';
          deliveryStatus = 'FAILED';
        } else {
          // Success status codes: 100 (Processed), 101 (Sent), 102 (Queued)
          const validCodes = [100, 101, 102];
          const isSuccess = recipient.status === 'Success' || validCodes.includes(Number(recipient.statusCode));

          if (isSuccess) {
            deliveryStatus = 'SENT';
          } else {
            failureReason = `SMS rejected by gateway: ${recipient.status} (Code: ${recipient.statusCode})`;
            deliveryStatus = 'FAILED';
          }
        }
      }
    } catch (err: any) {
      failureReason = err.message || 'Network connection to SMS gateway failed';
      deliveryStatus = 'FAILED';
    }

    // Record log in DB
    const [log] = await db
      .insert(absenceSmsLogs)
      .values({
        studentId,
        guardianId,
        phoneNumber: formattedPhone,
        consecutiveAbsences: 1,
        smsMessage: message,
        status: deliveryStatus,
      })
      .returning();

    if (deliveryStatus === 'FAILED') {
      throw new Error(failureReason || 'Failed to dispatch SMS through carrier gateway');
    }

    return log;
  }
}
