import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../auth/jwt.js';
import { authProvider } from '../auth/provider.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const authRouter = Router();

function userDTO(u: any) {
  return {
    _id: String(u._id),
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    avatarUrl: u.avatarUrl ?? '',
    batchId: u.batchId ? String(u.batchId) : null,
  };
}

// Mock login: trust the email, look it up, issue our JWT.
authRouter.post('/mock-login', async (req, res, next) => {
  try {
    if (env.AUTH_PROVIDER !== 'mock') {
      throw new HttpError(403, 'Mock login is disabled in this environment');
    }
    const email = await authProvider.resolveEmail(req.body);
    const user = await User.findOne({ email, isActive: true });
    if (!user) throw new HttpError(401, 'No account found for that email');
    const token = signToken({ sub: String(user._id), role: user.role as any });
    res.json({ token, user: userDTO(user) });
  } catch (err) {
    next(err);
  }
});

// Stub for real Google later
authRouter.post('/google', async (_req, _res, next) => {
  next(new HttpError(501, 'Google auth not enabled yet'));
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json(userDTO(req.user));
});

// Dev-only: list seeded users for the demo panel.
// Safe-ish here because: (a) accounts only exist if seeded, (b) no password
// is needed in mock mode. Disable in production.
authRouter.get('/dev-users', async (_req, res, next) => {
  try {
    if (env.NODE_ENV === 'production') {
      throw new HttpError(404, 'Not available');
    }
    const users = await User.find({ isActive: true })
      .sort({ role: 1, fullName: 1 })
      .select('email fullName role avatarUrl batchId');
    res.json(users.map(userDTO));
  } catch (err) {
    next(err);
  }
});
