import { db } from '../../config/db.js';
import { systemSettings, eq } from '@school/shared';

const DEFAULT_SYSTEM_SETTINGS = {
  id: 'default-settings',
  schoolName: 'Eldoret Muslim Academy',
  schoolMotto: 'Excellence in Knowledge & Virtue',
  contactPhone: '+254 714731331',
  contactEmail: 'eldoretmuslimacademy@gmail.com',
  address: 'Eldoret-Kitale Road near Tawakkal Mosque',
  poBox: 'P.O. Box 7768 – 30100, Eldoret',
  county: 'Eldoret, Uasin Gishu',
  currentAcademicYear: 2026,
  absenceSmsThreshold: 3,
  logoUrl: null,
};

// In-memory cache for system settings (5-minute TTL)
let cachedSettings: any = null;
let cachedSettingsTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export class SettingsService {
  static async getSettings() {
    const now = Date.now();
    if (cachedSettings && now - cachedSettingsTime < CACHE_TTL_MS) {
      return cachedSettings;
    }

    try {
      const [settings] = await db.select().from(systemSettings).limit(1);
      if (!settings) {
        // Create initial default settings if none exist
        const [newSettings] = await db.insert(systemSettings).values({
          schoolName: DEFAULT_SYSTEM_SETTINGS.schoolName,
          schoolMotto: DEFAULT_SYSTEM_SETTINGS.schoolMotto,
          contactPhone: DEFAULT_SYSTEM_SETTINGS.contactPhone,
          contactEmail: DEFAULT_SYSTEM_SETTINGS.contactEmail,
          address: DEFAULT_SYSTEM_SETTINGS.address,
          poBox: DEFAULT_SYSTEM_SETTINGS.poBox,
          county: DEFAULT_SYSTEM_SETTINGS.county,
          currentAcademicYear: DEFAULT_SYSTEM_SETTINGS.currentAcademicYear,
          absenceSmsThreshold: DEFAULT_SYSTEM_SETTINGS.absenceSmsThreshold,
        }).returning();
        cachedSettings = newSettings;
        cachedSettingsTime = now;
        return newSettings;
      }
      cachedSettings = settings;
      cachedSettingsTime = now;
      return settings;
    } catch (error) {
      console.warn('[SettingsService] Database query failed (using cached/fallback settings):', error);
      if (cachedSettings) {
        return cachedSettings;
      }
      return DEFAULT_SYSTEM_SETTINGS;
    }
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

    if (updated) {
      cachedSettings = updated;
      cachedSettingsTime = Date.now();
    }

    return updated || { ...current, ...data };
  }
}

