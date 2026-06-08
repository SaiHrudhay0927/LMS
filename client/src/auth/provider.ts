import { MockAuthProvider } from './MockAuthProvider';
// import { GoogleAuthProvider } from './GoogleAuthProvider';

// Swap to GoogleAuthProvider when ready — no other call sites change.
export const authProvider = MockAuthProvider;
