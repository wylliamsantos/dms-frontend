import { describe, expect, it } from 'vitest';

import { resolveAiExecutiveHighlights, resolveImportantPersistedMetadataEntries, resolveOcrSummaryText } from './documentInsight';

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

describe('resolveImportantPersistedMetadataEntries', () => {
  it('merges insight and entry metadata prioritizing entry values', () => {
    expect(
      resolveImportantPersistedMetadataEntries(
        { importantExtractedMetadata: { cpf: '222', valor: '' } },
        { documentId: 'doc-1', importantPersistedMetadata: { cpf: '111', numero: 'ABC' } }
      )
    ).toEqual([
      ['cpf', '222'],
      ['numero', 'ABC']
    ]);
  });
});
