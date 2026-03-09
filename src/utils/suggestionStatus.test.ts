import { describe, expect, it } from 'vitest';

import { resolveSuggestionsFreshnessLabel } from './suggestionStatus';

describe('resolveSuggestionsFreshnessLabel', () => {
  it('retorna null quando não há timestamp', () => {
    expect(resolveSuggestionsFreshnessLabel(null, 10_000)).toBeNull();
  });

  it('retorna estado de atualização imediata para poucos segundos', () => {
    expect(resolveSuggestionsFreshnessLabel(10_000, 13_900)).toBe('Sugestões atualizadas agora mesmo.');
  });

  it('retorna segundos quando menor que 1 minuto', () => {
    expect(resolveSuggestionsFreshnessLabel(10_000, 45_000)).toBe('Sugestões atualizadas há 35s.');
  });

  it('retorna minutos quando acima de 1 minuto', () => {
    expect(resolveSuggestionsFreshnessLabel(10_000, 130_000)).toBe('Sugestões atualizadas há 2min.');
  });
});
