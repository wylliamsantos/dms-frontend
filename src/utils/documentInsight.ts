import { DmsEntry, DocumentInsightResponse } from '@/types/document';

export const resolveOcrSummaryText = (entry?: DmsEntry): string | undefined => {
  const summary = entry?.ocrSummary?.trim();
  if (summary) return summary;

  const fullText = entry?.ocrText?.trim();
  if (!fullText) return undefined;

  const compact = fullText.replace(/\s+/g, ' ').trim();
  if (!compact) return undefined;
  return compact.length > 240 ? `${compact.slice(0, 240)}…` : compact;
};

export const resolveAiExecutiveHighlights = (insight?: DocumentInsightResponse): string[] => {
  const items = insight?.aiExecutiveHighlights ?? [];
  return items.map((item) => item.trim()).filter(Boolean).slice(0, 4);
};
