import type { Request, Response, NextFunction } from 'express';
import { db } from '../config/db.js';
import { users, invitations, roles, eq } from '@school/shared';

// General staff-management permission must not grant the ability to promote oneself
// or alter leadership credentials. Head teachers retain control of privileged accounts.
export async function staffMutationScope(req: Request, res: Response, next: NextFunction) {
  if (req.user?.roleName === 'HEAD_TEACHER') return next();
  const teachingRoles = new Set(['TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER']);
  try {
    const segments = req.path.split('/').filter(Boolean);
    const invitation = segments[0] === 'invitations';
    const id = invitation ? segments[1] : segments[0];
    if (id) {
      const table = invitation ? invitations : users;
      const [target] = await db.select({ roleName: roles.name }).from(table)
        .innerJoin(roles, eq(table.roleId, roles.id)).where(eq(table.id, id));
      if (!target || !teachingRoles.has(target.roleName))
        return res.status(403).json({ success: false, message: 'Only the Head Teacher can manage privileged staff accounts' });
    }
    if (req.body?.roleId) {
      const [targetRole] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, req.body.roleId));
      if (!targetRole || !teachingRoles.has(targetRole.name))
        return res.status(403).json({ success: false, message: 'Only the Head Teacher can assign privileged roles' });
    }
    return next();
  } catch {
    return res.status(503).json({ success: false, message: 'Staff authorization temporarily unavailable' });
  }
}
