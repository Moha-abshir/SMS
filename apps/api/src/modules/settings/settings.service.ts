import { db } from '../../config/db.js';
import { systemSettings, eq } from '@school/shared';

export class SettingsService {
  static async getSettings() {
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      // Create initial default settings if none exist
      const [newSettings] = await db.insert(systemSettings).values({
        schoolName: 'Eldoret Muslim Academy',
        schoolMotto: 'Excellence in Knowledge & Virtue',
        contactPhone: '+254 700 000 000',
        contactEmail: 'info@eldoretmuslimacademy.ac.ke',
        address: 'Kisumu Road, Eldoret',
        poBox: 'P.O. Box 1234 - 30100, Eldoret',
        county: 'Uasin Gishu',
        currentAcademicYear: 2026,
        absenceSmsThreshold: 3,
      }).returning();
      return newSettings;
    }
    return settings;
  }

  static async updateSettings(data: {
    schoolName?: string;
    schoolMotto?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    poBox?: string;
    county?: string;
    logoUrl?: string;
    absenceSmsThreshold?: number;
    currentAcademicYear?: number;
  }) {
    const current = await this.getSettings();
    const [updated] = await db
      .update(systemSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, current.id))
      .returning();

    return updated;
  }
}
