import { useMutation } from '@tanstack/react-query';

import { searchByBusinessKey, SearchByBusinessKeyPayload } from '@/api/search';

export function useSearchByBusinessKey() {
  return useMutation({
    mutationFn: (payload: SearchByBusinessKeyPayload) => searchByBusinessKey(payload)
  });
}
