import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser } from './types';

export function useDevUsers() {
  return useQuery({
    queryKey: ['dev-users'],
    queryFn: async () => {
      const { data } = await api.get<AuthUser[]>('/auth/dev-users');
      return data;
    },
    staleTime: 60_000,
  });
}
