import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
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
    return req.body?.email || req.user?.email || req.ip || 'anonymous_user';
  },
});

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
}

export function authorizePermission(permissionCode: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // HEAD_TEACHER has master access override
    if (req.user.roleName === 'HEAD_TEACHER' || req.user.permissions.includes(permissionCode)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires '${permissionCode}' permission.`,
    });
  };
}
