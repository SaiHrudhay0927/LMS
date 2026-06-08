import { api } from '@/lib/api';
import type { AuthProvider, LoginResult } from './types';

// Stub: in real flow we'd open Google popup, get an ID token,
// then POST it to /auth/google. The server verifies it and issues OUR JWT.
// Everything downstream is identical.
export const GoogleAuthProvider: AuthProvider = {
  name: 'google',
  async login(): Promise<LoginResult> {
    const idToken = 'TODO-real-google-id-token';
    const { data } = await api.post<LoginResult>('/auth/google', { idToken });
    return data;
  },
};
