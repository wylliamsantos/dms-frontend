import { useQuery } from '@tanstack/react-query';
import { searchSuggestions } from '@/api/search';

interface UseSearchSuggestionsParams {
  query: string;
  categories?: string[];
  limit?: number;
}

export function useSearchSuggestions({ query, categories = [], limit = 8 }: UseSearchSuggestionsParams) {
  const normalized = query.trim();
  const normalizedCategories = [...categories].sort((a, b) => a.localeCompare(b));

  return useQuery({
    queryKey: ['search-suggestions', normalized, normalizedCategories, limit],
    queryFn: ({ signal }) => searchSuggestions({ query: normalized, categories: normalizedCategories, limit }, signal),
    enabled: normalized.length >= 2,
    placeholderData: (previous) => previous,
    staleTime: 30_000
  });
}
