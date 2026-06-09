import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../auth/jwt.js';
import { GoogleAuthProvider } from '../auth/GoogleAuthProvider.js';
import { MockAuthProvider } from '../auth/MockAuthProvider.js';
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

async function loginByEmail(email: string, profile?: { fullName?: string; avatarUrl?: string }) {
  const normalized = email.toLowerCase();
  let user = await User.findOne({ email: normalized });

  // Bootstrap: the configured ADMIN_EMAIL can always sign in. If they don't
  // exist yet, create them as admin on first login. Everyone else must have
  // been provisioned by the admin already.
  if (!user && normalized === env.ADMIN_EMAIL) {
    user = await User.create({
      email: normalized,
      fullName: profile?.fullName || 'Admin',
      avatarUrl: profile?.avatarUrl || '',
      role: 'admin',
      isActive: true,
    });
    console.log(`[auth] bootstrapped admin account ${normalized}`);
  }

  if (!user) {
    throw new HttpError(
      403,
      'This Google account has not been added to Pulse LMS. Please ask the admin to provision your access.',
    );
  }
  if (!user.isActive) {
    throw new HttpError(403, 'This account has been deactivated. Contact the admin.');
  }

  // Keep profile fresh on each login (name/avatar change happens often).
  if (profile?.fullName && user.fullName !== profile.fullName && user.role !== 'admin') {
    user.fullName = profile.fullName;
  }
  if (profile?.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
    user.avatarUrl = profile.avatarUrl;
  }
  if (user.isModified()) await user.save();

  const token = signToken({ sub: String(user._id), role: user.role as any });
  return { token, user: userDTO(user) };
}

// Real Google sign-in: verify the ID token, then look the email up.
const googleSchema = z.object({ idToken: z.string().min(10) });
authRouter.post('/google', async (req, res, next) => {
  try {
    if (env.AUTH_PROVIDER !== 'google') {
      throw new HttpError(403, 'Google auth is disabled in this environment');
    }
    const { idToken } = googleSchema.parse(req.body);
    const profile = await GoogleAuthProvider.verify(idToken);
    const result = await loginByEmail(profile.email, {
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Mock login: only enabled when AUTH_PROVIDER=mock (dev convenience).
authRouter.post('/mock-login', async (req, res, next) => {
  try {
    if (env.AUTH_PROVIDER !== 'mock') {
      throw new HttpError(403, 'Mock login is disabled. Use POST /api/auth/google instead.');
    }
    const email = await MockAuthProvider.resolveEmail(req.body);
    const result = await loginByEmail(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json(userDTO(req.user));
});

// Reports which provider is active so the client can render the right UI.
authRouter.get('/config', (_req, res) => {
  res.json({
    provider: env.AUTH_PROVIDER,
    googleClientId: env.AUTH_PROVIDER === 'google' ? env.GOOGLE_CLIENT_ID : '',
  });
});
