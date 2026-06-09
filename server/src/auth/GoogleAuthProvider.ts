import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import type { AuthProvider } from './types.js';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  email: string;
  fullName: string;
  avatarUrl: string;
  emailVerified: boolean;
}

export const GoogleAuthProvider: AuthProvider & {
  verify(idToken: string): Promise<GoogleProfile>;
} = {
  name: 'google',
  async resolveEmail(payload) {
    if (!payload?.idToken || typeof payload.idToken !== 'string') {
      throw new HttpError(400, 'idToken is required');
    }
    const profile = await this.verify(payload.idToken);
    return profile.email;
  },
  async verify(idToken: string) {
    if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.startsWith('replace-')) {
      throw new HttpError(
        500,
        'Server is missing GOOGLE_CLIENT_ID. Configure it in server/.env and restart.',
      );
    }
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      throw new HttpError(401, 'Invalid Google ID token');
    }
    const p = ticket.getPayload();
    if (!p?.email) throw new HttpError(401, 'Google did not return an email');
    if (!p.email_verified) throw new HttpError(401, 'Your Google email is not verified');
    return {
      email: p.email.toLowerCase(),
      fullName: p.name ?? p.email,
      avatarUrl: p.picture ?? '',
      emailVerified: !!p.email_verified,
    };
  },
};
