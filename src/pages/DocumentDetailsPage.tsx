import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DocumentPreview } from '@/components/DocumentPreview';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MetadataPanel } from '@/components/MetadataPanel';
import { VersionList } from '@/components/VersionList';
import { VersionDiffPanel } from '@/components/VersionDiffPanel';
import {
  useDocumentBase64,
  useDocumentBinary,
  useDocumentInformation,
  useDocumentInsight,
  useDocumentRagContext,
  useDocumentVersions
} from '@/hooks/useDocumentDetails';
import {
  chatByDocument,
  fetchDocumentMetadataHistoryCategorySummary,
  fetchDocumentMetadataHistorySummary,
  updateDocumentMetadata
} from '@/api/document';
import { listWorkflowHistory } from '@/api/workflow';
import { DmsDocumentSearchResponse, DmsEntry } from '@/types/document';
import { formatDateTime } from '@/utils/format';
import { env } from '@/utils/env';
import { workflowStatusClassName, workflowStatusLabel } from '@/utils/labels';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const normalizeIso = (iso?: string) => {
  if (!iso) return undefined;
  const value = iso.trim();
  if (!value) return undefined;
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return hasTimezone ? value : `${value}Z`;
};

const formatDate = (iso?: string, locale = 'pt-BR') => {
  const normalized = normalizeIso(iso);
  if (!normalized) return undefined;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatPercent = (value?: number) => `${Math.round((value ?? 0) * 100)}%`;

export function DocumentDetailsPage() {
  const { documentId } = useParams();
  const [activeVersion, setActiveVersion] = useState<string | undefined>(undefined);
  const [entry, setEntry] = useState<DmsEntry | undefined>(undefined);
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [ocrHintLookbackDays, setOcrHintLookbackDays] = useState(30);
  const [ocrHintHistoryAction, setOcrHintHistoryAction] = useState<'ALL' | 'APPLIED' | 'CANCELLED' | 'ERROR'>('ALL');
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const informationQuery = useDocumentInformation(documentId, activeVersion);
  const versionsQuery = useDocumentVersions(documentId);
  const workflowHistoryQuery = useQuery({
    queryKey: ['workflow-history', documentId],
    queryFn: () => listWorkflowHistory(documentId as string),
    enabled: Boolean(documentId)
  });
  const insightQuery = useDocumentInsight(documentId, activeVersion, ocrHintLookbackDays);
  const ragContextQuery = useDocumentRagContext(documentId, activeVersion);
  const metadataHistorySummaryQuery = useQuery({
    queryKey: ['document-metadata-history-summary', documentId, activeVersion, ocrHintHistoryAction],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentMetadataHistorySummary(documentId, activeVersion, { ocrHintAction: ocrHintHistoryAction });
    },
    enabled: Boolean(documentId)
  });
  const metadataHistoryCategorySummaryQuery = useQuery({
    queryKey: ['document-metadata-history-category-summary', documentId, activeVersion, ocrHintHistoryAction],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentMetadataHistoryCategorySummary(documentId, activeVersion, { ocrHintAction: ocrHintHistoryAction });
    },
    enabled: Boolean(documentId)
  });

  const applyMetadataHintMutation = useMutation({
    mutationFn: async ({ field, suggestedValue }: { field: string; suggestedValue: string }) => {
      if (!documentId || !entry?.name) throw new Error('Documento sem contexto para atualização de metadados.');
      const currentProperties = (entry.properties ?? {}) as Record<string, unknown>;
      const mergedProperties = {
        ...currentProperties,
        [field]: suggestedValue
      };
      await updateDocumentMetadata(
        documentId,
        {
          fileName: entry.name,
          properties: mergedProperties
        },
        {
          source: 'OCR_HINT'
        }
      );
      return { field, suggestedValue };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-information', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-insight', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-rag-context', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-metadata-history-summary', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-metadata-history-category-summary', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
    }
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => chatByDocument(documentId as string, message, activeVersion),
    onError: () => {
      setChatMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Não consegui responder agora. Tente novamente em instantes.'
        }
      ]);
      if (!isChatOpen) setChatUnreadCount((current) => current + 1);
    },
    onSuccess: (response) => {
      const answer = response.answer?.trim() || response.message || 'Sem resposta no momento.';
      setChatMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: answer
        }
      ]);
      if (!isChatOpen) setChatUnreadCount((current) => current + 1);
    }
  });

  const contentMimeType = entry?.content?.mimeType ?? '';
  const contentSize = entry?.content?.sizeInBytes ?? 0;
  const isVideo = contentMimeType.startsWith('video/');
  const MAX_BASE64_BYTES = 5 * 1024 * 1024;
  const preferBinaryPreview = isVideo || contentSize >= MAX_BASE64_BYTES;

  const base64Query = useDocumentBase64(documentId, activeVersion, Boolean(entry) && !preferBinaryPreview);
  const binaryQuery = useDocumentBinary(documentId, activeVersion, Boolean(entry) && preferBinaryPreview);

  useEffect(() => {
    const infoEntry = informationQuery.data?.entry;
    if (!infoEntry) {
      return;
    }

    setEntry(infoEntry);
    if (!activeVersion) {
      setActiveVersion(infoEntry.version);
    }
  }, [informationQuery.data?.entry, activeVersion]);

  useEffect(() => {
    if (!preferBinaryPreview) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(undefined);
      }
      return;
    }

    if (!binaryQuery.data || !contentMimeType) {
      return;
    }

    const blob = new Blob([binaryQuery.data], { type: contentMimeType });
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [binaryQuery.data, contentMimeType, preferBinaryPreview, objectUrl]);

  const versionItems = useMemo(() => versionsQuery.data?.list?.content ?? [], [versionsQuery.data?.list?.content]);

  const timelineEvents = useMemo(() => {
    const workflow = (workflowHistoryQuery.data ?? []).map((item) => ({
      when: item.changedAt,
      title: `${workflowStatusLabel(item.fromStatus)} → ${workflowStatusLabel(item.toStatus)}`,
      detail: `${item.actor || 'system'} · ${item.reason || '-'}`
    }));

    const versions = versionItems
      .map((item) => item.entry)
      .filter(Boolean)
      .map((versionEntry) => ({
        when: versionEntry?.createdAt,
        title: `Versão ${versionEntry?.version || '-'}`,
        detail: `${versionEntry?.versionType || ''} ${versionEntry?.name || ''}`.trim()
      }));

    return [...workflow, ...versions]
      .filter((event) => !!event.when)
      .sort((a, b) => {
        const aw = normalizeIso(a.when);
        const bw = normalizeIso(b.when);
        return new Date(bw as string).getTime() - new Date(aw as string).getTime();
      })
      .slice(0, 8);
  }, [workflowHistoryQuery.data, versionItems]);

  const handleVersionSelect = (version: DmsDocumentSearchResponse) => {
    const newVersion = version.entry?.version;
    setActiveVersion(newVersion);
    if (version.entry) {
      setEntry(version.entry);
    }
  };

  const handleCopyIdentifier = async () => {
    if (!documentId) return;
    try {
      await navigator.clipboard.writeText(documentId);
      setCopyFeedback('UUID copiado!');
      window.setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback('Falha ao copiar UUID.');
    }
  };

  const isChatDisabled = !env.featureDocumentChat || !env.featureRagLocalMvp;

  useEffect(() => {
    if (isChatOpen) {
      setChatUnreadCount(0);
    }
  }, [isChatOpen]);

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || isChatDisabled || !documentId || chatMutation.isPending) return;

    setChatMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', text: message }
    ]);
    setChatInput('');
    await chatMutation.mutateAsync(message);
  };

  const handleApplyHint = async (field: string, suggestedValue?: string) => {
    if (!field || !suggestedValue) return;
    const confirmed = window.confirm(`Aplicar sugestão OCR para "${field}" com valor "${suggestedValue}"?`);
    if (!confirmed) return;
    await applyMetadataHintMutation.mutateAsync({ field, suggestedValue });
  };

  if (!documentId) {
    return <ErrorState title={t('details.invalidTitle')} description={t('details.invalidDescription')} />;
  }

  if (informationQuery.isLoading || versionsQuery.isLoading) {
    return <LoadingState message={t('details.loading')} />;
  }

  if (informationQuery.isError || versionsQuery.isError) {
    return (
      <ErrorState
        description={t('details.errorDescription')}
        onRetry={() => {
          informationQuery.refetch();
          versionsQuery.refetch();
        }}
      />
    );
  }

  const locale = i18n.language.startsWith('es')
    ? 'es-ES'
    : i18n.language.startsWith('en')
      ? 'en-US'
      : 'pt-BR';

  const createdAtLabel = formatDate(entry?.createdAt, locale);
  const modifiedAtLabel = formatDate(entry?.modifiedAt, locale);
  const currentVersionLabel = entry?.version
    ? `${entry.version}${entry?.versionType ? ` · ${entry.versionType}` : ''}`
    : undefined;

  const insight = insightQuery.data;
  const ragContext = ragContextQuery.data;
  const metadataHints = insight?.metadataActionHints ?? [];
  const importantPersistedMetadataEntries = Object.entries(insight?.importantPersistedMetadata ?? {}).slice(0, 6);
  const persistedMetadataPreviewEntries = Object.entries(insight?.persistedMetadataPreview ?? {}).slice(0, 8);
  const ocrStatsEntries = Object.entries(insight?.ocrStats ?? {}).filter(([, value]) => value !== null && value !== undefined && `${value}`.trim() !== '');
  const ocrHintHistory = (insight?.metadataUpdateHistory ?? [])
    .filter((item) => {
      const source = String(item.source ?? '').toUpperCase();
      if (ocrHintHistoryAction === 'APPLIED') return source === 'OCR_HINT';
      if (ocrHintHistoryAction === 'CANCELLED') return source === 'OCR_HINT_CANCEL' || source === 'OCR_HINT_DISMISSED';
      if (ocrHintHistoryAction === 'ERROR') return source === 'OCR_HINT_ERROR';
      return source.startsWith('OCR_HINT');
    })
    .slice(0, 5);
  const metadataHistorySummary = metadataHistorySummaryQuery.data;
  const metadataHistoryCategorySummary = metadataHistoryCategorySummaryQuery.data;

  const documentSourceBuckets = metadataHistorySummary?.bySource ?? [];
  const categorySourceBuckets = metadataHistoryCategorySummary?.bySource ?? [];
  const benchmarkSourceRows = Array.from(new Set([...documentSourceBuckets.map((bucket) => bucket.key), ...categorySourceBuckets.map((bucket) => bucket.key)]))
    .map((key) => {
      const documentCount = documentSourceBuckets.find((bucket) => bucket.key === key)?.count ?? 0;
      const categoryCount = categorySourceBuckets.find((bucket) => bucket.key === key)?.count ?? 0;
      return {
        key,
        documentCount,
        categoryCount,
        delta: documentCount - categoryCount
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 5);

  const documentFieldBuckets = metadataHistorySummary?.byField ?? [];
  const categoryFieldBuckets = metadataHistoryCategorySummary?.byField ?? [];
  const benchmarkFieldRows = Array.from(new Set([...documentFieldBuckets.map((bucket) => bucket.key), ...categoryFieldBuckets.map((bucket) => bucket.key)]))
    .map((key) => {
      const documentCount = documentFieldBuckets.find((bucket) => bucket.key === key)?.count ?? 0;
      const categoryCount = categoryFieldBuckets.find((bucket) => bucket.key === key)?.count ?? 0;
      return {
        key,
        documentCount,
        categoryCount,
        delta: documentCount - categoryCount
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 5);

  return (
    <div className="page-document-details">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>
          ← {t('details.back')}
        </Link>
      </div>

      <div className="card details-hero-card" style={{ marginBottom: '1rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '16rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: '#6366f1' }}>{t('details.header.title')}</span>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a', wordBreak: 'break-all', lineHeight: 1.2 }}>{entry?.name ?? t('details.untitled')}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.95rem' }}>
            {entry?.category ? <div><span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{t('details.header.category')}</span><strong style={{ color: '#0f172a' }}>{entry.category}</strong></div> : null}
            {createdAtLabel ? <div><span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{t('details.header.createdAt')}</span><span>{createdAtLabel}</span></div> : null}
            {modifiedAtLabel ? <div><span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{t('details.header.updatedAt')}</span><span>{modifiedAtLabel}</span></div> : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start', textAlign: 'left', minWidth: '16rem', flex: '1 1 320px' }}>
          {entry?.workflowStatus ? (
            <div style={{ color: '#475569', fontSize: '0.95rem' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Status workflow</span>
              <span className={workflowStatusClassName(entry.workflowStatus)}>{workflowStatusLabel(entry.workflowStatus)}</span>
            </div>
          ) : null}

          {currentVersionLabel ? (
            <div style={{ color: '#475569', fontSize: '0.95rem' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{t('details.header.version')}</span>
              <strong style={{ color: '#0f172a' }}>{currentVersionLabel}</strong>
            </div>
          ) : null}

          <div style={{ width: '100%' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.25rem' }}>{t('details.header.identifier')}</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
              <code style={{ display: 'block', flex: 1, background: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', color: '#0f172a', wordBreak: 'break-all' }}>{documentId}</code>
              <button type="button" className="button button--ghost" onClick={handleCopyIdentifier} aria-label="Copiar UUID" title="Copiar UUID">📋</button>
            </div>
            {copyFeedback ? <span style={{ fontSize: '0.8rem', color: copyFeedback.includes('Falha') ? '#b91c1c' : '#166534' }}>{copyFeedback}</span> : null}
          </div>
        </div>
      </div>

      <div className="details-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <section className="card details-main-section" aria-label="Visualização e informações do documento">
            <div className="details-main-section__preview">
              <DocumentPreview
                entry={entry}
                base64={base64Query.data}
                objectUrl={objectUrl}
                isLoading={(preferBinaryPreview && (binaryQuery.isLoading || binaryQuery.isFetching)) || (!preferBinaryPreview && (base64Query.isLoading || base64Query.isFetching))}
                isError={preferBinaryPreview ? binaryQuery.isError : base64Query.isError}
                errorMessage={preferBinaryPreview && binaryQuery.isError ? 'Não foi possível carregar o conteúdo a partir do armazenamento.' : undefined}
              />
            </div>

            <aside className="details-main-section__info" aria-label="Informações e andamento">
              <h2 style={{ marginTop: 0 }}>Informações e andamento</h2>
              <MetadataPanel entry={entry} />

              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Timeline essencial</h3>
                {timelineEvents.length === 0 ? <p style={{ color: '#64748b' }}>Sem eventos para exibir.</p> : (
                  <div className="timeline" aria-live="polite">
                    {timelineEvents.map((event, index) => (
                      <div key={`${index}-${event.when}`} className="timeline__item">
                        <div className="timeline__dot" />
                        <div className="timeline__content">
                          <strong>{event.title}</strong>
                          <div style={{ fontSize: '0.9rem', color: '#475569' }}>{event.detail}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatDateTime(normalizeIso(event.when))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Insights de OCR/IA</h3>
                {insightQuery.isLoading ? (
                  <p style={{ color: '#64748b' }}>Carregando insights...</p>
                ) : insightQuery.isError || !insight ? (
                  <p style={{ color: '#b91c1c' }}>Não foi possível carregar os insights do documento.</p>
                ) : (
                  <>
                    <p style={{ marginTop: 0 }}>{insight.summary || 'Sem resumo disponível.'}</p>
                    {insight.generatedAt ? (
                      <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Atualizado em: {formatDate(insight.generatedAt, locale) || insight.generatedAt}
                      </p>
                    ) : null}
                    {(insight.persistedMetadataCount !== undefined || insight.hasPersistedOcrText !== undefined) ? (
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                        {insight.persistedMetadataCount !== undefined ? <span className="status-pill">Metadados persistidos: {insight.persistedMetadataCount}</span> : null}
                        {insight.hasPersistedOcrText !== undefined ? <span className="status-pill">OCR persistido: {insight.hasPersistedOcrText ? 'sim' : 'não'}</span> : null}
                      </div>
                    ) : null}

                    {importantPersistedMetadataEntries.length ? (
                      <div style={{ marginTop: '0.75rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.45rem' }}>Metadados importantes extraídos</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.45rem' }}>
                          {importantPersistedMetadataEntries.map(([key, value]) => (
                            <div key={key} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.45rem 0.55rem' }}>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{key}</div>
                              <div style={{ fontSize: '0.82rem', color: '#0f172a', wordBreak: 'break-word' }}>{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {ocrStatsEntries.length ? (
                      <div style={{ marginTop: '0.75rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Resumo OCR persistido</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {ocrStatsEntries.map(([key, value]) => (
                            <span key={key} className="status-pill">{key}: {String(value)}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {persistedMetadataPreviewEntries.length ? (
                      <details style={{ marginTop: '0.8rem' }}>
                        <summary style={{ cursor: 'pointer', color: '#334155', fontSize: '0.84rem' }}>Ver preview completo dos metadados persistidos</summary>
                        <div style={{ marginTop: '0.45rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.45rem' }}>
                          {persistedMetadataPreviewEntries.map(([key, value]) => (
                            <div key={key} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.45rem 0.55rem' }}>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{key}</div>
                              <div style={{ fontSize: '0.82rem', color: '#0f172a', wordBreak: 'break-word' }}>{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    {metadataHints.length ? (
                      <div style={{ marginTop: '0.75rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Sugestões acionáveis</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {metadataHints.slice(0, 4).map((hint) => (
                            <div key={`${hint.field}-${hint.action}`} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.6rem 0.7rem' }}>
                              <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                                <strong>{hint.field}</strong> · {hint.reason}
                              </div>
                              {hint.suggestedValue ? (
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>Sugestão: <code>{hint.suggestedValue}</code></div>
                              ) : null}
                              {hint.evidenceExcerpt ? (
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>Evidência: {hint.evidenceExcerpt}</div>
                              ) : null}
                              <div style={{ marginTop: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="button button--ghost"
                                  onClick={() => handleApplyHint(hint.field, hint.suggestedValue)}
                                  disabled={applyMetadataHintMutation.isPending || !hint.suggestedValue}
                                >
                                  Aplicar sugestão
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {insight.ocrHintAdoption ? (
                      <div style={{ marginTop: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <strong style={{ display: 'block' }}>Adoção OCR_HINT</strong>
                          <label style={{ fontSize: '0.76rem', color: '#64748b', display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                            Janela
                            <select
                              className="select-input"
                              value={ocrHintLookbackDays}
                              onChange={(event) => setOcrHintLookbackDays(Number(event.target.value))}
                              style={{ fontSize: '0.76rem', padding: '0.2rem 0.35rem', minWidth: '5.5rem' }}
                            >
                              <option value={7}>7 dias</option>
                              <option value={30}>30 dias</option>
                              <option value={90}>90 dias</option>
                            </select>
                          </label>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span>Documento: {Math.round((insight.ocrHintAdoption.documentOcrHintRate ?? 0) * 100)}% aplicado ({insight.ocrHintAdoption.documentOcrHintUpdates}/{insight.ocrHintAdoption.documentTotalUpdates})</span>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Funil doc: aplicado {insight.ocrHintAdoption.documentOcrHintUpdates} · cancelado {insight.ocrHintAdoption.documentOcrHintCancelUpdates} · erro {insight.ocrHintAdoption.documentOcrHintErrorUpdates}</span>
                          <span>Categoria: {Math.round((insight.ocrHintAdoption.categoryOcrHintRate ?? 0) * 100)}% aplicado ({insight.ocrHintAdoption.categoryOcrHintUpdates}/{insight.ocrHintAdoption.categoryTotalUpdates})</span>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Funil categoria: aplicado {insight.ocrHintAdoption.categoryOcrHintUpdates} · cancelado {insight.ocrHintAdoption.categoryOcrHintCancelUpdates} · erro {insight.ocrHintAdoption.categoryOcrHintErrorUpdates}</span>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Período aplicado: últimos {insight.ocrHintAdoption.lookbackDaysApplied} dias.</span>
                        </div>
                        {insight.ocrHintAdoption.trend?.length ? (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {insight.ocrHintAdoption.trend.map((point) => (
                              <div key={point.label} style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                {point.label}: {Math.round((point.ocrHintRate ?? 0) * 100)}% aplicado ({point.ocrHintUpdates}/{point.totalUpdates}) · cxl {point.ocrHintCancelUpdates} · erro {point.ocrHintErrorUpdates}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div style={{ marginTop: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <strong style={{ display: 'block' }}>Histórico curto OCR_HINT</strong>
                        <label style={{ fontSize: '0.76rem', color: '#64748b', display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          Ação
                          <select
                            className="select-input"
                            value={ocrHintHistoryAction}
                            onChange={(event) => setOcrHintHistoryAction(event.target.value as 'ALL' | 'APPLIED' | 'CANCELLED' | 'ERROR')}
                            style={{ fontSize: '0.76rem', padding: '0.2rem 0.35rem', minWidth: '6.5rem' }}
                          >
                            <option value="ALL">Todas</option>
                            <option value="APPLIED">Aplicado</option>
                            <option value="CANCELLED">Cancelado</option>
                            <option value="ERROR">Erro</option>
                          </select>
                        </label>
                      </div>
                      {ocrHintHistory.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {ocrHintHistory.map((item, index) => (
                            <div key={`${item.field}-${item.updatedAt}-${index}`} style={{ borderLeft: '3px solid #6366f1', paddingLeft: '0.6rem' }}>
                              <div style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                                <strong>{item.field}</strong>: <code>{item.previousValue || '-'}</code> → <code>{item.newValue || '-'}</code>
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                {formatDate(item.updatedAt, locale) || item.updatedAt || '-'} · {item.updatedBy || 'system'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#64748b', margin: 0 }}>Sem mudanças OCR_HINT para o filtro selecionado.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Benchmark OCR_HINT (documento x categoria)</h3>
                {metadataHistorySummaryQuery.isLoading || metadataHistoryCategorySummaryQuery.isLoading ? (
                  <p style={{ color: '#64748b' }}>Atualizando benchmark para o filtro selecionado...</p>
                ) : metadataHistorySummaryQuery.isError || metadataHistoryCategorySummaryQuery.isError ? (
                  <p style={{ color: '#b91c1c' }}>Não foi possível carregar o benchmark OCR_HINT.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem', color: '#334155' }}>
                    <span>
                      Documento: {metadataHistorySummary?.filteredEntries ?? 0} mudanças filtradas de {metadataHistorySummary?.totalEntries ?? 0} totais.
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      Funil doc: aplicado {metadataHistorySummary?.ocrHintAppliedEntries ?? 0} · cancelado {metadataHistorySummary?.ocrHintCancelledEntries ?? 0} · erro {metadataHistorySummary?.ocrHintErrorEntries ?? 0} · taxa aplicada {formatPercent(metadataHistorySummary?.ocrHintAppliedRate)}
                    </span>
                    <span>
                      Categoria ({metadataHistoryCategorySummary?.category || '-' }): {metadataHistoryCategorySummary?.filteredEntries ?? 0} mudanças filtradas de {metadataHistoryCategorySummary?.totalEntries ?? 0} totais em {metadataHistoryCategorySummary?.totalDocumentsWithUpdates ?? 0}/{metadataHistoryCategorySummary?.totalDocumentsInCategory ?? 0} docs.
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      Funil categoria: aplicado {metadataHistoryCategorySummary?.ocrHintAppliedEntries ?? 0} · cancelado {metadataHistoryCategorySummary?.ocrHintCancelledEntries ?? 0} · erro {metadataHistoryCategorySummary?.ocrHintErrorEntries ?? 0} · taxa aplicada {formatPercent(metadataHistoryCategorySummary?.ocrHintAppliedRate)}
                    </span>

                    {benchmarkSourceRows.length ? (
                      <div style={{ marginTop: '0.35rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Top fontes com maior desvio (doc - categoria)</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {benchmarkSourceRows.map((row) => (
                            <span key={`source-${row.key}`} style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {row.key}: doc {row.documentCount} · cat {row.categoryCount} · Δ {row.delta > 0 ? '+' : ''}{row.delta}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {benchmarkFieldRows.length ? (
                      <div style={{ marginTop: '0.35rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Top campos com maior desvio (doc - categoria)</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {benchmarkFieldRows.map((row) => (
                            <span key={`field-${row.key}`} style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {row.key}: doc {row.documentCount} · cat {row.categoryCount} · Δ {row.delta > 0 ? '+' : ''}{row.delta}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      Filtro aplicado no comparativo: <strong>{ocrHintHistoryAction}</strong> (alinhado com o histórico curto).
                    </span>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>RAG documental (MVP)</h3>
                {ragContextQuery.isLoading ? (
                  <p style={{ color: '#64748b' }}>Carregando contexto RAG...</p>
                ) : ragContextQuery.isError || !ragContext ? (
                  <p style={{ color: '#b91c1c' }}>Não foi possível carregar o contexto RAG.</p>
                ) : (
                  <>
                    <p style={{ marginTop: 0 }}>
                      Status: <strong>{ragContext.status}</strong> · {ragContext.message}
                    </p>
                    {ragContext.qualityBand ? <p style={{ fontSize: '0.84rem', color: '#475569' }}>Faixa de qualidade: {ragContext.qualityBand}</p> : null}
                    {ragContext.missingRequiredMetadata?.length ? (
                      <p style={{ fontSize: '0.84rem', color: '#92400e' }}>
                        Campos obrigatórios faltando: {ragContext.missingRequiredMetadata.join(', ')}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </aside>
          </section>

          <VersionDiffPanel documentId={documentId} versions={versionItems} />
        </div>

        <VersionList items={versionItems} activeVersion={activeVersion} onSelect={handleVersionSelect} />
      </div>

      <button
        type="button"
        className="details-chat-fab"
        onClick={() => setIsChatOpen(true)}
        aria-label="Abrir chat do documento"
      >
        💬 Chat
        {chatUnreadCount > 0 ? <span className="details-chat-fab__badge">{chatUnreadCount > 9 ? '9+' : chatUnreadCount}</span> : null}
      </button>

      {isChatOpen ? (
        <div className="details-chat-overlay" onClick={() => setIsChatOpen(false)}>
          <aside
            className="details-chat-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Chat do documento"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="details-chat-drawer__header">
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Chat do documento</h2>
              <button type="button" className="button button--ghost" onClick={() => setIsChatOpen(false)} aria-label="Fechar chat">✕</button>
            </header>

            <div className="details-chat-drawer__messages" aria-live="polite">
              {isChatDisabled ? (
                <p className="details-inline-hint">Chat indisponível no momento.</p>
              ) : !chatMessages.length ? (
                <p style={{ color: '#64748b', margin: 0 }}>Faça uma pergunta sobre o documento.</p>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble ${message.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}
                  >
                    {message.text}
                  </div>
                ))
              )}
              {chatMutation.isPending ? (
                <div className="chat-bubble chat-bubble--assistant chat-bubble--typing">digitando...</div>
              ) : null}
            </div>

            <div className="details-chat-drawer__composer">
              <textarea
                className="text-input"
                rows={3}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={isChatDisabled ? 'Chat indisponível no momento.' : 'Digite sua pergunta...'}
                disabled={isChatDisabled || chatMutation.isPending}
                aria-label="Mensagem do chat"
              />
              <button
                type="button"
                className="button button--primary"
                onClick={handleSendChat}
                disabled={isChatDisabled || chatMutation.isPending || !chatInput.trim()}
              >
                Enviar
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
