import { describe, expect, it } from 'vitest';

import { resolveAiExecutiveHighlights, resolveOcrSummaryText } from './documentInsight';

describe('resolveOcrSummaryText', () => {
  it('returns ocrSummary when available', () => {
    expect(resolveOcrSummaryText({ ocrSummary: 'Resumo pronto', ocrText: 'Texto completo' })).toBe('Resumo pronto');
  });

  it('falls back to compacted ocrText excerpt when summary is missing', () => {
    expect(resolveOcrSummaryText({ ocrText: '  linha 1\n\nlinha   2  ' })).toBe('linha 1 linha 2');
  });
});

describe('resolveAiExecutiveHighlights', () => {
  it('normalizes and limits highlights', () => {
    expect(
      resolveAiExecutiveHighlights({
        documentId: 'doc-1',
        aiExecutiveHighlights: [' A ', '', 'B', 'C', 'D', 'E']
      })
    ).toEqual(['A', 'B', 'C', 'D']);
  });
});
