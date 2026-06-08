import type { AuthProvider } from './types.js';
import { HttpError } from '../middleware/error.js';

// Stub: real implementation will verify the ID token with Google's certs
// (e.g. via google-auth-library) and return the verified email claim.
// The rest of the server doesn't care — same JWT, same downstream routing.
export const GoogleAuthProvider: AuthProvider = {
  name: 'google',
  async resolveEmail(_payload) {
    throw new HttpError(501, 'Google auth is not enabled yet — using mock provider.');
  },
};
