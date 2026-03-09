export const resolveSuggestionsFreshnessLabel = (lastSuggestionsUpdateAt?: number | null, now = Date.now()) => {
  if (!lastSuggestionsUpdateAt) return null;
  const seconds = Math.max(0, Math.round((now - lastSuggestionsUpdateAt) / 1000));
  if (seconds <= 4) return 'Sugestões atualizadas agora mesmo.';
  if (seconds < 60) return `Sugestões atualizadas há ${seconds}s.`;
  const minutes = Math.round(seconds / 60);
  return `Sugestões atualizadas há ${minutes}min.`;
};
