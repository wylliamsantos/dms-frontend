import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useMutation, useQuery } from '@tanstack/react-query';

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
import { chatByDocument, fetchDocumentMetadataHistory, fetchDocumentMetadataHistoryCategorySummary, fetchDocumentMetadataHistorySummary, updateDocumentMetadata } from '@/api/document';
import { listWorkflowHistory } from '@/api/workflow';
import { DmsDocumentSearchResponse, DmsEntry } from '@/types/document';
import { formatDateTime } from '@/utils/format';
import { env } from '@/utils/env';
import { workflowStatusClassName, workflowStatusLabel } from '@/utils/labels';

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

const OCR_TEXT_PROPERTY_CANDIDATES = ['ocrText', 'ocr_text', 'ocr_full_text', 'fullOcrText'];

export function DocumentDetailsPage() {
  const { documentId } = useParams();
  const [activeVersion, setActiveVersion] = useState<string | undefined>(undefined);
  const [entry, setEntry] = useState<DmsEntry | undefined>(undefined);
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showFullOcrText, setShowFullOcrText] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [metadataHintFeedback, setMetadataHintFeedback] = useState<string | null>(null);
  const [metadataHistoryPage, setMetadataHistoryPage] = useState(0);
  const [metadataHistorySource, setMetadataHistorySource] = useState('');
  const [metadataHistoryField, setMetadataHistoryField] = useState('');
  const [metadataHistoryUpdatedFrom, setMetadataHistoryUpdatedFrom] = useState('');
  const [metadataHistoryUpdatedTo, setMetadataHistoryUpdatedTo] = useState('');
  const { t, i18n } = useTranslation();

  const informationQuery = useDocumentInformation(documentId, activeVersion);
  const versionsQuery = useDocumentVersions(documentId);
  const insightQuery = useDocumentInsight(documentId, activeVersion);
  const ragContextQuery = useDocumentRagContext(documentId, activeVersion);
  const workflowHistoryQuery = useQuery({
    queryKey: ['workflow-history', documentId],
    queryFn: () => listWorkflowHistory(documentId as string),
    enabled: Boolean(documentId)
  });
  const metadataHistoryQuery = useQuery({
    queryKey: [
      'document-metadata-history',
      documentId,
      activeVersion,
      metadataHistoryPage,
      metadataHistorySource,
      metadataHistoryField,
      metadataHistoryUpdatedFrom,
      metadataHistoryUpdatedTo
    ],
    queryFn: () => fetchDocumentMetadataHistory(documentId as string, metadataHistoryPage, 10, activeVersion, {
      source: metadataHistorySource || undefined,
      field: metadataHistoryField || undefined,
      updatedFrom: metadataHistoryUpdatedFrom || undefined,
      updatedTo: metadataHistoryUpdatedTo || undefined
    }),
    enabled: Boolean(documentId)
  });
  const metadataHistorySummaryQuery = useQuery({
    queryKey: [
      'document-metadata-history-summary',
      documentId,
      activeVersion,
      metadataHistorySource,
      metadataHistoryField,
      metadataHistoryUpdatedFrom,
      metadataHistoryUpdatedTo
    ],
    queryFn: () => fetchDocumentMetadataHistorySummary(documentId as string, activeVersion, {
      source: metadataHistorySource || undefined,
      field: metadataHistoryField || undefined,
      updatedFrom: metadataHistoryUpdatedFrom || undefined,
      updatedTo: metadataHistoryUpdatedTo || undefined
    }),
    enabled: Boolean(documentId)
  });
  const metadataHistoryCategorySummaryQuery = useQuery({
    queryKey: [
      'document-metadata-history-summary-category',
      documentId,
      activeVersion,
      metadataHistorySource,
      metadataHistoryField,
      metadataHistoryUpdatedFrom,
      metadataHistoryUpdatedTo
    ],
    queryFn: () => fetchDocumentMetadataHistoryCategorySummary(documentId as string, activeVersion, {
      source: metadataHistorySource || undefined,
      field: metadataHistoryField || undefined,
      updatedFrom: metadataHistoryUpdatedFrom || undefined,
      updatedTo: metadataHistoryUpdatedTo || undefined
    }),
    enabled: Boolean(documentId)
  });
  const chatMutation = useMutation({
    mutationFn: (message: string) => chatByDocument(documentId as string, message, activeVersion),
    onError: () => {
      // handled in UI
    }
  });
  const applyMetadataHintMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => {
      if (!documentId || !entry?.name) {
        throw new Error('Documento inválido para atualização de metadados.');
      }

      const mergedProperties: Record<string, unknown> = {
        ...(entry.properties || {}),
        [field]: value
      };

      return updateDocumentMetadata(
        documentId,
        {
          fileName: entry.name,
          properties: mergedProperties
        },
        {
          source: 'OCR_HINT'
        }
      );
    },
    onSuccess: async () => {
      setMetadataHintFeedback('Metadado preenchido com sugestão OCR. Confirme e revise antes de seguir.');
      await Promise.all([
        informationQuery.refetch(),
        insightQuery.refetch(),
        ragContextQuery.refetch(),
        metadataHistoryQuery.refetch(),
        metadataHistorySummaryQuery.refetch(),
        metadataHistoryCategorySummaryQuery.refetch()
      ]);
      window.setTimeout(() => setMetadataHintFeedback(null), 2600);
    },
    onError: () => {
      setMetadataHintFeedback('Falha ao aplicar sugestão OCR no metadado.');
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
    setMetadataHistoryPage(0);
    setMetadataHistorySource('');
    setMetadataHistoryField('');
    setMetadataHistoryUpdatedFrom('');
    setMetadataHistoryUpdatedTo('');
  }, [activeVersion]);

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
      detail: `${item.actor || 'system'} · ${item.reason || '-'}`,
      kind: 'workflow'
    }));

    const versions = versionItems
      .map((item) => item.entry)
      .filter(Boolean)
      .map((entry) => ({
        when: entry?.createdAt,
        title: `Versão ${entry?.version || '-'}`,
        detail: `${entry?.versionType || ''} ${entry?.name || ''}`.trim(),
        kind: 'version'
      }));

    return [...workflow, ...versions]
      .filter((event) => !!event.when)
      .sort((a, b) => {
        const aw = normalizeIso(a.when);
        const bw = normalizeIso(b.when);
        return new Date(bw as string).getTime() - new Date(aw as string).getTime();
      });
  }, [workflowHistoryQuery.data, versionItems]);

  const fullOcrText = useMemo(() => {
    if (entry?.ocrText?.trim()) return entry.ocrText.trim();
    const properties = entry?.properties;
    if (!properties) return undefined;
    for (const key of OCR_TEXT_PROPERTY_CANDIDATES) {
      const value = properties[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }, [entry?.ocrText, entry?.properties]);

  const ocrStats = useMemo(() => {
    if (!fullOcrText) return null;
    const chars = fullOcrText.length;
    const lines = fullOcrText.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
    const words = fullOcrText.split(/\s+/).filter(Boolean).length;
    return { chars, lines, words };
  }, [fullOcrText]);

  const hasImportantExtractedMetadata = Boolean(
    entry?.importantExtractedMetadata && Object.keys(entry.importantExtractedMetadata).length
  );
  const hasOcrSummary = Boolean(entry?.ocrSummary?.trim());
  const isOcrEligibleMime = contentMimeType.startsWith('image/') || contentMimeType === 'application/pdf';
  const shouldShowOcrCard = isOcrEligibleMime && (hasOcrSummary || Boolean(fullOcrText) || hasImportantExtractedMetadata);

  const handleVersionSelect = (version: DmsDocumentSearchResponse) => {
    const newVersion = version.entry?.version;
    setActiveVersion(newVersion);
    if (version.entry) {
      setEntry(version.entry);
      setShowFullOcrText(false);
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

  const lastChatStatus = chatMutation.data?.status;
  const showProviderUnavailableHint = lastChatStatus === 'PROVIDER_UNAVAILABLE';

  const handleSendChat = () => {
    const message = chatInput.trim();
    if (!message || isChatDisabled || !documentId) return;
    chatMutation.mutate(message);
  };

  const handleApplyHintSuggestedValue = (field: string, suggestedValue?: string) => {
    const value = suggestedValue?.trim();
    if (!field || !value || applyMetadataHintMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(`Aplicar sugestão OCR no campo "${field}" com o valor "${value}"?`);
    if (!confirmed) {
      return;
    }

    applyMetadataHintMutation.mutate({ field, value });
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
  const isChatDisabled = !env.featureDocumentChat || !env.featureRagLocalMvp;
  const chatUnavailableHint = !env.featureRagLocalMvp
    ? 'Chat temporariamente indisponível: recurso local de contexto não está ativo.'
    : !env.featureDocumentChat
      ? 'Chat temporariamente indisponível: feature flag local desativada.'
      : undefined;
  const ragStatus = ragContextQuery.data?.status;
  const missingRequiredMetadata = ragContextQuery.data?.missingRequiredMetadata?.length
    ? ragContextQuery.data.missingRequiredMetadata
    : (insightQuery.data?.missingRequiredMetadata ?? []);
  const ragStatusTone = ragStatus === 'READY'
    ? { background: '#ecfdf5', color: '#166534', border: '#86efac' }
    : ragStatus === 'QUALITY_GATED'
      ? { background: '#fff7ed', color: '#9a3412', border: '#fdba74' }
      : ragStatus === 'TENANT_DISABLED' || ragStatus === 'DISABLED' || ragStatus === 'CATEGORY_DISABLED'
        ? { background: '#fffbeb', color: '#92400e', border: '#fcd34d' }
        : { background: '#f8fafc', color: '#475569', border: '#cbd5e1' };
  const metadataHistoryItems = metadataHistoryQuery.data?.content?.length
    ? metadataHistoryQuery.data.content
    : (insightQuery.data?.metadataUpdateHistory ?? []);
  const metadataHistoryTotal = metadataHistoryQuery.data?.totalElements ?? metadataHistoryItems.length;
  const metadataHistorySize = metadataHistoryQuery.data?.size ?? 10;
  const metadataHistoryPageCount = Math.max(1, Math.ceil(metadataHistoryTotal / Math.max(1, metadataHistorySize)));
  const regressionAlertFields = new Set(
    (insightQuery.data?.metadataRegressionAlerts ?? [])
      .filter((alert) => alert.dimension === 'FIELD')
      .map((alert) => alert.key.toLowerCase())
  );
  const prioritizedActionHints = [...(insightQuery.data?.metadataActionHints ?? [])].sort((a, b) => {
    const aScore = regressionAlertFields.has(a.field.toLowerCase()) ? 1 : 0;
    const bScore = regressionAlertFields.has(b.field.toLowerCase()) ? 1 : 0;
    return bScore - aScore;
  });

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
          {shouldShowOcrCard ? (
            <div className="card details-ocr-highlight">
              <div className="details-ocr-highlight__header">
                <span className="badge badge--success">Resumo OCR</span>
                <span className="details-ocr-highlight__hint">Destaque automático da extração</span>
              </div>
              <h2 style={{ marginTop: '0.35rem' }}>OCR do documento</h2>
              {hasOcrSummary ? <p className="details-ocr-highlight__summary">{entry?.ocrSummary}</p> : null}
              {ocrStats ? (
                <p style={{ marginTop: '-0.25rem', color: '#475569', fontSize: '0.82rem' }}>
                  OCR persistido: {ocrStats.words} palavras · {ocrStats.lines} linhas · {ocrStats.chars} caracteres
                </p>
              ) : null}
              {hasImportantExtractedMetadata ? (
                <div className="metadata-grid" style={{ marginBottom: '0.75rem' }}>
                  {Object.entries(entry?.importantExtractedMetadata || {}).map(([key, value]) => (
                    <div className="metadata-item" key={key}>
                      <strong>{key}</strong>
                      <span>{value == null ? '-' : String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {fullOcrText ? (
                <>
                  <button type="button" className="button button--ghost" onClick={() => setShowFullOcrText((current) => !current)}>
                    {showFullOcrText ? 'Ocultar OCR completo' : 'Expandir OCR completo'}
                  </button>
                  {showFullOcrText ? <pre className="text-preview" style={{ marginTop: '0.75rem', maxHeight: 320 }}>{fullOcrText}</pre> : null}
                </>
              ) : null}
            </div>
          ) : null}

          <MetadataPanel entry={entry} />

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Insights de IA (MVP)</h2>
            {insightQuery.isLoading ? <p style={{ color: '#64748b' }}>Gerando insights...</p> : insightQuery.isError ? <p style={{ color: '#b91c1c' }}>Não foi possível carregar insights neste momento.</p> : (
              <>
                <p style={{ marginTop: 0 }}>{insightQuery.data?.summary || 'Sem resumo disponível para este documento.'}</p>
                {insightQuery.data?.keyMetadata && Object.keys(insightQuery.data.keyMetadata).length ? (
                  <div className="metadata-grid">
                    {Object.entries(insightQuery.data.keyMetadata).map(([key, value]) => (
                      <div className="metadata-item" key={key}><strong>{key}</strong><span>{value == null ? '-' : String(value)}</span></div>
                    ))}
                  </div>
                ) : null}
                {insightQuery.data?.warnings?.length ? <ul style={{ marginBottom: '0.75rem' }}>{insightQuery.data.warnings.map((warning) => (<li key={warning}>{warning}</li>))}</ul> : null}
                {insightQuery.data?.importantPersistedMetadata && Object.keys(insightQuery.data.importantPersistedMetadata).length ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Metadados importantes (persistidos)</strong>
                    <div className="metadata-grid">
                      {Object.entries(insightQuery.data.importantPersistedMetadata).map(([key, value]) => (
                        <div className="metadata-item" key={`important-${key}`}><strong>{key}</strong><span>{value == null ? '-' : String(value)}</span></div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {insightQuery.data?.persistedMetadataPreview && Object.keys(insightQuery.data.persistedMetadataPreview).length ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Metadados persistidos (preview)</strong>
                    <div className="metadata-grid">
                      {Object.entries(insightQuery.data.persistedMetadataPreview).map(([key, value]) => (
                        <div className="metadata-item" key={`persisted-${key}`}><strong>{key}</strong><span>{value == null ? '-' : String(value)}</span></div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {insightQuery.data?.signals?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.75rem' }}>
                    {insightQuery.data.signals.map((signal) => (
                      <span
                        key={signal.signal}
                        title={signal.description}
                        style={{
                          borderRadius: '999px',
                          border: `1px solid ${signal.active ? '#14b8a6' : '#cbd5e1'}`,
                          background: signal.active ? '#f0fdfa' : '#f8fafc',
                          color: signal.active ? '#0f766e' : '#64748b',
                          padding: '0.15rem 0.55rem',
                          fontSize: '0.76rem',
                          fontWeight: 600
                        }}
                      >
                        {signal.signal.toUpperCase()} {signal.active ? '✓' : '·'}
                      </span>
                    ))}
                  </div>
                ) : null}
                {insightQuery.data?.expectedRequiredMetadata?.length ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Cobertura de metadados obrigatórios</strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                      Esperados: {insightQuery.data.expectedRequiredMetadata.join(', ')}
                    </p>
                    {insightQuery.data.missingRequiredMetadata?.length ? (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#b45309' }}>
                        Faltando: {insightQuery.data.missingRequiredMetadata.join(', ')}
                      </p>
                    ) : (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#166534' }}>
                        Todos os metadados obrigatórios estão persistidos.
                      </p>
                    )}
                    {typeof insightQuery.data.requiredMetadataCoveragePercent === 'number' ? (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
                        Cobertura obrigatória: {insightQuery.data.requiredMetadataCoveragePercent}%
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {insightQuery.data?.metadataRegressionAlerts?.length ? (
                  <div style={{ marginBottom: '0.75rem', border: '1px solid #fee2e2', borderRadius: '0.55rem', padding: '0.45rem 0.6rem', background: '#fff1f2' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', color: '#9f1239' }}>Alertas de regressão (OCR/metadados)</strong>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#881337' }}>
                      {insightQuery.data.metadataRegressionAlerts.map((alert, idx) => (
                        <li key={`regression-${alert.dimension}-${alert.key}-${idx}`} style={{ marginBottom: '0.25rem' }}>
                          <strong>{alert.dimension}:{alert.key}</strong> · {alert.severity} · {alert.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {prioritizedActionHints.length ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Próximas ações recomendadas</strong>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#334155' }}>
                      {prioritizedActionHints.map((hint, idx) => (
                        <li key={`hint-${hint.field}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                          <strong>{hint.field}</strong> · {hint.action} · {hint.reason}
                          {regressionAlertFields.has(hint.field.toLowerCase()) ? (
                            <span style={{ marginLeft: '0.35rem', fontSize: '0.72rem', color: '#9f1239', fontWeight: 700 }}>[prioridade por alerta]</span>
                          ) : null}
                          {hint.suggestedValue ? (
                            <div style={{ fontSize: '0.82rem', color: '#0f766e', marginTop: '0.18rem' }}>
                              Sugestão OCR: <code>{hint.suggestedValue}</code>
                            </div>
                          ) : null}
                          {hint.suggestedValue && hint.action === 'EXTRACT_FROM_OCR' ? (
                            <div style={{ marginTop: '0.3rem' }}>
                              <button
                                type="button"
                                className="button button--ghost"
                                onClick={() => handleApplyHintSuggestedValue(hint.field, hint.suggestedValue)}
                                disabled={applyMetadataHintMutation.isPending}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                              >
                                {applyMetadataHintMutation.isPending ? 'Aplicando...' : 'Aplicar sugestão'}
                              </button>
                            </div>
                          ) : null}
                          {hint.evidenceExcerpt ? (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.12rem' }}>
                              {hint.evidenceExcerpt}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {metadataHintFeedback ? (
                      <p style={{ margin: '0.45rem 0 0', fontSize: '0.8rem', color: metadataHintFeedback.includes('Falha') ? '#b91c1c' : '#166534' }}>
                        {metadataHintFeedback}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {(metadataHistoryQuery.data || metadataHistoryItems.length) ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Histórico de ajustes de metadados</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.45rem', marginBottom: '0.5rem' }}>
                      <input
                        value={metadataHistorySource}
                        onChange={(event) => {
                          setMetadataHistoryPage(0);
                          setMetadataHistorySource(event.target.value);
                        }}
                        placeholder="Filtrar source (ex.: OCR_HINT)"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '0.45rem', padding: '0.35rem 0.45rem', fontSize: '0.78rem' }}
                      />
                      <input
                        value={metadataHistoryField}
                        onChange={(event) => {
                          setMetadataHistoryPage(0);
                          setMetadataHistoryField(event.target.value);
                        }}
                        placeholder="Filtrar campo (ex.: valor)"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '0.45rem', padding: '0.35rem 0.45rem', fontSize: '0.78rem' }}
                      />
                      <input
                        value={metadataHistoryUpdatedFrom}
                        onChange={(event) => {
                          setMetadataHistoryPage(0);
                          setMetadataHistoryUpdatedFrom(event.target.value);
                        }}
                        placeholder="updatedFrom ISO (ex.: 2026-03-06T08:00:00Z)"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '0.45rem', padding: '0.35rem 0.45rem', fontSize: '0.78rem' }}
                      />
                      <input
                        value={metadataHistoryUpdatedTo}
                        onChange={(event) => {
                          setMetadataHistoryPage(0);
                          setMetadataHistoryUpdatedTo(event.target.value);
                        }}
                        placeholder="updatedTo ISO (ex.: 2026-03-06T09:00:00Z)"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '0.45rem', padding: '0.35rem 0.45rem', fontSize: '0.78rem' }}
                      />
                    </div>
                    {metadataHistorySummaryQuery.data ? (
                      <div style={{ marginBottom: '0.55rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem', padding: '0.45rem 0.6rem', background: '#f8fafc' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
                          Resumo filtros: {metadataHistorySummaryQuery.data.filteredEntries} de {metadataHistorySummaryQuery.data.totalEntries} ajustes
                          {metadataHistorySummaryQuery.data.latestUpdatedAt ? ` · último em ${formatDateTime(normalizeIso(metadataHistorySummaryQuery.data.latestUpdatedAt))}` : ''}
                        </p>
                        {metadataHistorySummaryQuery.data.bySource.length ? (
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: '#334155' }}>
                            Top sources: {metadataHistorySummaryQuery.data.bySource.map((bucket) => `${bucket.key} (${bucket.count})`).join(' · ')}
                          </p>
                        ) : null}
                        {metadataHistorySummaryQuery.data.byField.length ? (
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: '#334155' }}>
                            Top campos: {metadataHistorySummaryQuery.data.byField.map((bucket) => `${bucket.key} (${bucket.count})`).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {metadataHistoryCategorySummaryQuery.data ? (
                      <div style={{ marginBottom: '0.55rem', border: '1px solid #dbeafe', borderRadius: '0.55rem', padding: '0.45rem 0.6rem', background: '#eff6ff' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e3a8a' }}>
                          Benchmark categoria {metadataHistoryCategorySummaryQuery.data.category || 'N/A'}: {metadataHistoryCategorySummaryQuery.data.filteredEntries} de {metadataHistoryCategorySummaryQuery.data.totalEntries} ajustes
                          {' · '}
                          docs com histórico {metadataHistoryCategorySummaryQuery.data.totalDocumentsWithUpdates}/{metadataHistoryCategorySummaryQuery.data.totalDocumentsInCategory}
                        </p>
                        {metadataHistoryCategorySummaryQuery.data.bySource.length ? (
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: '#1e40af' }}>
                            Top sources (categoria): {metadataHistoryCategorySummaryQuery.data.bySource.map((bucket) => `${bucket.key} (${bucket.count})`).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {metadataHistoryItems.length ? (
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#334155' }}>
                        {metadataHistoryItems.map((entry, idx) => (
                          <li key={`history-${entry.field}-${entry.updatedAt ?? idx}`} style={{ marginBottom: '0.3rem' }}>
                            <strong>{entry.field}</strong>: <code>{entry.previousValue ?? '∅'}</code> → <code>{entry.newValue ?? '∅'}</code>
                            <span style={{ color: '#64748b' }}>
                              {' '}
                              ({entry.source || 'MANUAL'}{entry.updatedBy ? ` · ${entry.updatedBy}` : ''}{entry.updatedAt ? ` · ${formatDateTime(normalizeIso(entry.updatedAt))}` : ''})
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: '0 0 0.35rem', color: '#64748b', fontSize: '0.82rem' }}>Nenhum ajuste encontrado com os filtros atuais.</p>
                    )}
                    <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => setMetadataHistoryPage((current) => Math.max(0, current - 1))}
                        disabled={metadataHistoryPage <= 0 || metadataHistoryQuery.isLoading}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Página {Math.min(metadataHistoryPage + 1, metadataHistoryPageCount)} de {metadataHistoryPageCount} · {metadataHistoryTotal} itens
                      </span>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => setMetadataHistoryPage((current) => Math.min(metadataHistoryPageCount - 1, current + 1))}
                        disabled={metadataHistoryPage >= metadataHistoryPageCount - 1 || metadataHistoryQuery.isLoading}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                ) : null}
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 0 }}>
                  Fonte: {insightQuery.data?.source || 'n/a'} · confiança {(insightQuery.data?.confidence ?? 0).toFixed(2)}
                  {insightQuery.data?.confidenceBand ? ` (${insightQuery.data.confidenceBand})` : ''}
                  {typeof insightQuery.data?.persistedMetadataCount === 'number' ? ` · metadados persistidos ${insightQuery.data.persistedMetadataCount}` : ''}
                  {typeof insightQuery.data?.hasPersistedOcrText === 'boolean' ? ` · OCR persistido ${insightQuery.data.hasPersistedOcrText ? 'sim' : 'não'}` : ''}
                  {insightQuery.data?.ocrStats && Object.keys(insightQuery.data.ocrStats).length
                    ? ` · OCR ${String(insightQuery.data.ocrStats.words ?? '-')} palavras/${String(insightQuery.data.ocrStats.lines ?? '-')} linhas`
                    : ''}
                  {insightQuery.data?.generatedAt ? ` · atualizado em ${formatDateTime(normalizeIso(insightQuery.data.generatedAt))}` : ''}
                </p>
              </>
            )}
          </div>

          <div className="card details-chat-card">
            <h2 style={{ marginTop: 0 }}>Chat do documento</h2>
            <p style={{ color: '#64748b', marginTop: 0 }}>Pergunte sobre OCR/metadados. O contexto RAG é aplicado internamente no pipeline do chat.</p>
            {!isChatDisabled && ragStatus ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '999px', border: `1px solid ${ragStatusTone.border}`, background: ragStatusTone.background, color: ragStatusTone.color, padding: '0.2rem 0.65rem', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                RAG: {ragStatus}
                {(ragContextQuery.data?.chunkCount ?? ragContextQuery.data?.chunks?.length) ? (
                  <span style={{ fontWeight: 600 }}>· {ragContextQuery.data?.chunkCount ?? ragContextQuery.data?.chunks.length} chunks</span>
                ) : null}
              </div>
            ) : null}
            {!isChatDisabled && ragContextQuery.data?.message ? (
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '-0.2rem' }}>{ragContextQuery.data.message}</p>
            ) : null}
            {!isChatDisabled && ragStatus === 'QUALITY_GATED' && missingRequiredMetadata.length ? (
              <p style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '-0.1rem' }}>
                Para liberar o chat com RAG, complete os metadados obrigatórios faltantes: {missingRequiredMetadata.join(', ')}.
              </p>
            ) : null}
            {!isChatDisabled && ragContextQuery.data ? (
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '-0.25rem' }}>
                Categoria: {ragContextQuery.data.category || 'unknown'}
                {ragContextQuery.data.qualityBand ? ` · qualidade ${ragContextQuery.data.qualityBand}` : ''}
                {typeof ragContextQuery.data.averageScore === 'number' ? ` · score médio ${ragContextQuery.data.averageScore.toFixed(2)}` : ''}
                {typeof ragContextQuery.data.latencyMs === 'number' ? ` · ${ragContextQuery.data.latencyMs}ms` : ''}
              </p>
            ) : null}
            {!isChatDisabled && ragContextQuery.data?.chunks?.length ? (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Chunks de contexto (RAG MVP)</strong>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#334155' }}>
                  {ragContextQuery.data.chunks.slice(0, 3).map((chunk, idx) => (
                    <li key={`rag-chunk-${idx}`} style={{ marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{chunk.source.toUpperCase()} · score {chunk.score.toFixed(2)}</span>
                      <div style={{ fontSize: '0.86rem' }}>{chunk.excerpt}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isChatDisabled && chatUnavailableHint ? (
              <p className="details-inline-hint" style={{ marginBottom: '0.75rem' }}>
                {chatUnavailableHint}
              </p>
            ) : null}
            <textarea
              className="text-input"
              rows={4}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={isChatDisabled ? 'Chat indisponível no momento.' : 'Digite uma pergunta sobre este documento...'}
              disabled={isChatDisabled || chatMutation.isPending}
              style={{ width: '100%', resize: 'vertical', background: isChatDisabled ? '#f8fafc' : undefined, borderColor: isChatDisabled ? '#cbd5e1' : undefined }}
            />
            <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="button button--primary" onClick={handleSendChat} disabled={isChatDisabled || chatMutation.isPending || !chatInput.trim()}>
                {chatMutation.isPending ? 'Enviando...' : 'Enviar'}
              </button>
              {chatMutation.isError || showProviderUnavailableHint ? (
                <button type="button" className="button button--ghost" onClick={handleSendChat} disabled={isChatDisabled || chatMutation.isPending || !chatInput.trim()}>
                  Tentar novamente
                </button>
              ) : null}
            </div>
            {chatMutation.isError ? <p className="details-inline-hint" style={{ marginBottom: 0 }}>Não foi possível responder agora. Confira se os serviços locais estão ativos e clique em <strong>Tentar novamente</strong>.</p> : null}
            {showProviderUnavailableHint ? (
              <p className="details-inline-hint" style={{ marginBottom: 0 }}>
                O provedor local de IA está indisponível no momento. Verifique se o Ollama está ativo e se o modelo padrão foi inicializado (ex.: <code>llama3.2:1b</code>). Em seguida, clique em <strong>Tentar novamente</strong>.
              </p>
            ) : null}
            {chatMutation.data ? (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <p style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                  <strong>Status:</strong> {chatMutation.data.status} · {chatMutation.data.message}
                  {chatMutation.data.model ? ` · modelo ${chatMutation.data.model}` : ''}
                  {typeof chatMutation.data.latencyMs === 'number' ? ` · ${chatMutation.data.latencyMs}ms` : ''}
                </p>
                {chatMutation.data.answer ? <p style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>{chatMutation.data.answer}</p> : null}
                {chatMutation.data.contextChunks?.length ? (
                  <>
                    <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Fontes usadas</strong>
                    <ul style={{ marginTop: 0, marginBottom: 0 }}>
                      {chatMutation.data.contextChunks.map((chunk, idx) => (
                        <li key={`ctx-${idx}`} style={{ marginBottom: '0.35rem' }}>{chunk}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <VersionDiffPanel documentId={documentId} versions={versionItems} />

          <DocumentPreview
            entry={entry}
            base64={base64Query.data}
            objectUrl={objectUrl}
            isLoading={(preferBinaryPreview && (binaryQuery.isLoading || binaryQuery.isFetching)) || (!preferBinaryPreview && (base64Query.isLoading || base64Query.isFetching))}
            isError={preferBinaryPreview ? binaryQuery.isError : base64Query.isError}
            errorMessage={preferBinaryPreview && binaryQuery.isError ? 'Não foi possível carregar o conteúdo a partir do armazenamento.' : undefined}
          />

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Timeline do documento</h2>
            {timelineEvents.length === 0 ? <p style={{ color: '#64748b' }}>Sem eventos para exibir.</p> : (
              <div className="timeline">
                {timelineEvents.map((event, index) => (
                  <div key={`${event.kind}-${index}-${event.when}`} className="timeline__item">
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
        </div>

        <VersionList items={versionItems} activeVersion={activeVersion} onSelect={handleVersionSelect} />
      </div>
    </div>
  );
}
