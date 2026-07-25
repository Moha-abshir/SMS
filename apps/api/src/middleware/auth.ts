import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

// Memory map for User-Identifier Rate Limiting (NEVER IP-BASED)
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

export function userRateLimiter(maxRequests = 10, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userIdentifier = req.body?.email || req.user?.email || 'anonymous_user';

    const now = Date.now();
    const limitData = userRateLimits.get(userIdentifier) || { count: 0, resetTime: now + windowMs };

    if (now > limitData.resetTime) {
      limitData.count = 1;
      limitData.resetTime = now + windowMs;
    } else {
      limitData.count += 1;
    }

    userRateLimits.set(userIdentifier, limitData);

    if (limitData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts for this user account. Please try again after 1 minute.',
      });
    }

    next();
  };
}

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
