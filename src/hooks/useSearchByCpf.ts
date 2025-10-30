import { useMutation } from '@tanstack/react-query';

import { searchByCpf, SearchByCpfPayload } from '@/api/search';

export function useSearchByCpf() {
  return useMutation({
    mutationFn: (payload: SearchByCpfPayload) => searchByCpf(payload)
  });
}
