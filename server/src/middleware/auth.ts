import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtPayload } from '../auth/jwt.js';
import { User } from '../models/User.js';
import { HttpError } from './error.js';

export interface AuthedRequest extends Request {
  auth?: JwtPayload;
  user?: Awaited<ReturnType<typeof User.findById>>;
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Authentication required');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new HttpError(401, 'Account not found or inactive');
    req.auth = payload;
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function requireRole(...roles: Array<'admin' | 'coordinator' | 'student'>) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(req.user.role as any)) {
      return next(new HttpError(403, 'You do not have access to this resource'));
    }
    next();
  };
}
