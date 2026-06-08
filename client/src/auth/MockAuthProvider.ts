import { api } from '@/lib/api';
import type { AuthProvider, LoginResult } from './types';

export const MockAuthProvider: AuthProvider = {
  name: 'mock',
  async login({ email }): Promise<LoginResult> {
    const { data } = await api.post<LoginResult>('/auth/mock-login', { email });
    return data;
  },
};
