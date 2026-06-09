import { api } from '@/lib/api';
import type { AuthProvider, LoginResult } from './types';

// The client provider exchanges a Google ID token for our JWT.
// The actual Google popup + ID token retrieval is handled by @react-oauth/google
// in the Login page, which then calls this with the resulting credential.
export const GoogleAuthProvider: AuthProvider & {
  loginWithIdToken(idToken: string): Promise<LoginResult>;
} = {
  name: 'google',
  async login() {
    throw new Error('Use loginWithIdToken — the Google popup yields the idToken.');
  },
  async loginWithIdToken(idToken: string): Promise<LoginResult> {
    const { data } = await api.post<LoginResult>('/auth/google', { idToken });
    return data;
  },
};
