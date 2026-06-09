import { GoogleAuthProvider } from './GoogleAuthProvider';

// Google sign-in is the active provider. The MockAuthProvider stays in the
// codebase for offline dev work — to switch, change this import.
export const authProvider = GoogleAuthProvider;
