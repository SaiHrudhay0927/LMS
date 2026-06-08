import { env } from '../config/env.js';
import { MockAuthProvider } from './MockAuthProvider.js';
import { GoogleAuthProvider } from './GoogleAuthProvider.js';
import type { AuthProvider } from './types.js';

export const authProvider: AuthProvider =
  env.AUTH_PROVIDER === 'google' ? GoogleAuthProvider : MockAuthProvider;
