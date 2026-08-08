import { db } from '../config/db.js';
import { auditLogs } from '@school/shared';

export interface AuditLogOptions {
  actorId?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  userIdentifier: string;
}

export class AuditService {
  static async log(options: AuditLogOptions) {
    try {
      await db.insert(auditLogs).values({
        actorId: options.actorId || null,
        action: options.action,
        entityName: options.entityName,
        entityId: options.entityId || null,
        oldValues: options.oldValues ? options.oldValues : null,
        newValues: options.newValues ? options.newValues : null,
        userIdentifier: options.userIdentifier,
      });
    } catch (error) {
      console.error('[Audit Log Error] Failed to write audit log:', error);
      // Non-blocking log failure
    }
  }
}
