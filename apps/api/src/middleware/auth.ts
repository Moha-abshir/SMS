import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
import { users, eq } from '@school/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  tokenVersion: number;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const userRateLimiter = rateLimit({
  windowMs: 60 * 2000, // 2 minute
  max: 10, // Limit each user to 10 requests per `window`
  message: {
    success: false,
    message: 'Too many attempts for this user account. Please try again after 1 minute.',
  },
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : req.user?.email;
    return email ? `email:${email}` : ipKeyGenerator(req.ip || '127.0.0.1');
  },
});

// In-memory session validation cache (60 seconds TTL) to eliminate DB latency on every API request
interface CachedSession {
  tokenVersion: number;
  isActive: boolean;
  cachedAt: number;
}
const userSessionCache = new Map<string, CachedSession>();

export function invalidateUserSessionCache(userId: string) {
  userSessionCache.delete(userId);
}

export function setUserSessionCache(userId: string, session: { tokenVersion: number; isActive: boolean }) {
  if (userSessionCache.size >= 1000) userSessionCache.delete(userSessionCache.keys().next().value!);
  userSessionCache.set(userId, { ...session, cachedAt: Date.now() });
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: AuthenticatedUser;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthenticatedUser;
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }

  if (!decoded || typeof decoded.id !== 'string' || !Number.isInteger(decoded.tokenVersion)) {
    return res.status(401).json({ success: false, message: 'Invalid session claims' });
  }

  // Check in-memory cache before hitting database
  const now = Date.now();
  const cached = userSessionCache.get(decoded.id);
  let userRecord = cached && (now - cached.cachedAt < 60000) ? cached : null;

  if (!userRecord) {
    try {
      const [dbUser] = await db.select({ tokenVersion: users.tokenVersion, isActive: users.isActive }).from(users).where(eq(users.id, decoded.id));
      if (!dbUser) {
        return res.status(401).json({ success: false, message: 'User account not found' });
      }
      userRecord = { tokenVersion: dbUser.tokenVersion, isActive: dbUser.isActive, cachedAt: now };
      setUserSessionCache(decoded.id, userRecord);
    } catch (dbError) {
      return res.status(503).json({ success: false, message: 'Session validation temporarily unavailable. Please retry.' });
    }
  }

  if (!userRecord.isActive || decoded.tokenVersion !== userRecord.tokenVersion) {
    userSessionCache.delete(decoded.id);
    return res.status(401).json({ success: false, message: 'Session revoked or expired. Please log in again.' });
  }

  req.user = decoded;
  next();
}

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  HEAD_TEACHER: ['*'],
  DEPUTY_HEAD: [
    'staff:manage',
    'inventory:manage',
    'leave:manage',
    'allocations:manage',
    'attendance:manage',
    'marks:approve',
    'marks:review',
    'marks:entry',
  ],
  DEPUTY_HEAD_TEACHER: [
    'staff:manage',
    'inventory:manage',
    'leave:manage',
    'allocations:manage',
    'attendance:manage',
    'marks:approve',
    'marks:review',
    'marks:entry',
  ],
  DOS: [
    'exams:manage',
    'reports:lock',
    'marks:approve',
    'marks:review',
    'marks:entry',
    'attendance:manage',
  ],
  BURSAR: [
    'finance:view',
    'finance:record_payment',
    'finance:bill',
    'finance:bill',
    'fees:structure-edit',
  ],
  SECRETARY: [
    'students:create',
    'students:approve',
    'students:transfer',
    'attendance:manage',
    'staff:manage',
  ],
  TEACHER: [
    'attendance:manage',
    'marks:entry',
  ],
};

export function authorizePermission(permissionCode: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const roleName = req.user.roleName;

    // HEAD_TEACHER has master access override
    if (roleName === 'HEAD_TEACHER') {
      return next();
    }

    const defaultRolePerms = ROLE_DEFAULT_PERMISSIONS[roleName] || [];
    const userPerms = [...(req.user.permissions || []), ...defaultRolePerms];

    if (userPerms.includes('*')) {
      return next();
    }

    const requiredPerms = Array.isArray(permissionCode) ? permissionCode : [permissionCode];
    const hasPermission = requiredPerms.some((perm) => userPerms.includes(perm));

    if (hasPermission) {
      return next();
    }

    const displayCode = Array.isArray(permissionCode) ? permissionCode.join(' or ') : permissionCode;
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires '${displayCode}' permission.`,
    });
  };
}
