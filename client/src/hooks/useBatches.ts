import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BatchSummary {
  _id: string;
  name: string;
  description?: string;
  coordinatorId?: { _id: string; fullName: string; email: string } | null;
  isArchived: boolean;
}

export function useMyBatches() {
  return useQuery({
    queryKey: ['batches', 'mine'],
    queryFn: async () => (await api.get<BatchSummary[]>('/batches/mine')).data,
  });
}
