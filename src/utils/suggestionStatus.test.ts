import { describe, expect, it } from 'vitest';

import { resolveSuggestionsFreshnessLabel } from '@/utils/suggestionStatus';

describe('resolveSuggestionsFreshnessLabel', () => {
  it('mantém mensagens estáveis por faixa temporal', () => {
    const now = 1_000_000;
    expect(resolveSuggestionsFreshnessLabel(now, now)).toBe('Sugestões atualizadas agora mesmo.');
    expect(resolveSuggestionsFreshnessLabel(now - 12_000, now)).toBe('Sugestões atualizadas há 12s.');
    expect(resolveSuggestionsFreshnessLabel(now - 120_000, now)).toBe('Sugestões atualizadas há 2min.');
  });
});
