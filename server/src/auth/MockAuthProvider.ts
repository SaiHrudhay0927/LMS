import { z } from 'zod';
import type { AuthProvider } from './types.js';
import { HttpError } from '../middleware/error.js';

const schema = z.object({ email: z.string().email() });

export const MockAuthProvider: AuthProvider = {
  name: 'mock',
  async resolveEmail(payload) {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new HttpError(400, 'Invalid login payload');
    return parsed.data.email.toLowerCase();
  },
};
