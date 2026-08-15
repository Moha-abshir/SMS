import { db } from '../../config/db.js';
import { subjects, eq, isNull, asc } from '@school/shared';

export class SubjectsService {
  static async getAllSubjects() {
    return await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        levelCategory: subjects.levelCategory,
        createdAt: subjects.createdAt,
      })
      .from(subjects)
      .where(isNull(subjects.deletedAt))
      .orderBy(asc(subjects.levelCategory), asc(subjects.name));
  }

  static async createSubject(data: { name: string; code: string; levelCategory: 'PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR' | 'PPE' }) {
    const formattedCode = data.code.trim().toUpperCase();
    const formattedName = data.name.trim();

    // Check if code already exists in DB
    const [existing] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.code, formattedCode));

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted subject
        const [restored] = await db
          .update(subjects)
          .set({
            name: formattedName,
            levelCategory: data.levelCategory as any,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(subjects.id, existing.id))
          .returning();
        return restored;
      }
      throw new Error(`A subject with code '${formattedCode}' already exists in the system.`);
    }

    const [newSubject] = await db
      .insert(subjects)
      .values({
        name: formattedName,
        code: formattedCode,
        levelCategory: data.levelCategory as any,
      })
      .returning();

    return newSubject;
  }

  static async updateSubject(id: string, data: { name?: string; code?: string; levelCategory?: 'PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR' | 'PPE' }) {
    const updatePayload: any = { updatedAt: new Date() };
    if (data.name) updatePayload.name = data.name.trim();
    if (data.code) updatePayload.code = data.code.trim().toUpperCase();
    if (data.levelCategory) updatePayload.levelCategory = data.levelCategory;

    const [updated] = await db
      .update(subjects)
      .set(updatePayload)
      .where(eq(subjects.id, id))
      .returning();

    return updated;
  }

  static async deleteSubject(id: string) {
    await db
      .update(subjects)
      .set({ deletedAt: new Date() })
      .where(eq(subjects.id, id));
    return true;
  }
}
