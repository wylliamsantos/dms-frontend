import { useMutation } from '@tanstack/react-query';
import { searchByCpf } from '@/api/search';
export function useSearchByCpf() {
    return useMutation({
        mutationFn: (payload) => searchByCpf(payload)
    });
}
