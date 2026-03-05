import { useQuery } from '@tanstack/react-query';
import { searchSuggestions } from '@/api/search';

interface UseSearchSuggestionsParams {
  query: string;
  categories?: string[];
  limit?: number;
}

export function useSearchSuggestions({ query, categories = [], limit = 8 }: UseSearchSuggestionsParams) {
  const normalized = query.trim();

  return useQuery({
    queryKey: ['search-suggestions', normalized, categories, limit],
    queryFn: () => searchSuggestions({ query: normalized, categories, limit }),
    enabled: normalized.length >= 2,
    placeholderData: (previous) => previous,
    staleTime: 30_000
  });
}
