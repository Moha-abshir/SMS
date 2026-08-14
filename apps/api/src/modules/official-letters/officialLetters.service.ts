import { db } from '../../config/db.js';
import { officialLetters, systemSettings, eq, isNull, desc } from '@school/shared';

export class OfficialLettersService {
  static async getLetters() {
    return await db
      .select()
      .from(officialLetters)
      .where(isNull(officialLetters.deletedAt))
      .orderBy(desc(officialLetters.createdAt));
  }

  static async createLetter(data: {
    title: string;
    recipientName?: string;
    recipientAddress?: string;
    body: string;
  }, createdById: string) {
    const [created] = await db
      .insert(officialLetters)
      .values({
        title: data.title,
        recipientName: data.recipientName,
        recipientAddress: data.recipientAddress,
        body: data.body,
        createdById,
        status: 'FINALIZED',
      })
      .returning();

    return created;
  }

  static async getLetterPrintData(id: string) {
    const [letter] = await db.select().from(officialLetters).where(eq(officialLetters.id, id));
    const [settings] = await db.select().from(systemSettings).limit(1);

    if (!letter) throw new Error('Letter not found');

    return {
      letter,
      settings: settings || {
        schoolName: 'Eldoret Muslim Academy',
        schoolMotto: 'Excellence in Knowledge & Virtue',
        contactPhone: '+254 700 000 000',
        contactEmail: 'info@eldoretmuslimacademy.ac.ke',
        address: 'Kisumu Road, Eldoret',
        poBox: 'P.O. Box 1234 - 30100, Eldoret',
        county: 'Uasin Gishu',
      },
    };
  }

  static async deleteLetter(id: string) {
    const [deleted] = await db
      .update(officialLetters)
      .set({ deletedAt: new Date() })
      .where(eq(officialLetters.id, id))
      .returning();

    return deleted;
  }
}
