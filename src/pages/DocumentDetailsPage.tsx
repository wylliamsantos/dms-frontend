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
import { chatByDocument } from '@/api/document';
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
  const chatMutation = useMutation({
    mutationFn: (message: string) => chatByDocument(documentId as string, message, activeVersion),
    onError: () => {
      // handled in UI
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

  const handleSendChat = () => {
    const message = chatInput.trim();
    if (!message || isChatDisabled || !documentId) return;
    chatMutation.mutate(message);
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
          <div className="card details-ocr-highlight">
            <div className="details-ocr-highlight__header">
              <span className="badge badge--success">Resumo OCR</span>
              <span className="details-ocr-highlight__hint">Destaque automático da extração</span>
            </div>
            <h2 style={{ marginTop: '0.35rem' }}>OCR do documento</h2>
            <p className="details-ocr-highlight__summary">{entry?.ocrSummary || 'Sem resumo OCR disponível para esta versão.'}</p>
            {entry?.importantExtractedMetadata && Object.keys(entry.importantExtractedMetadata).length ? (
              <div className="metadata-grid" style={{ marginBottom: '0.75rem' }}>
                {Object.entries(entry.importantExtractedMetadata).map(([key, value]) => (
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
                {insightQuery.data?.warnings?.length ? <ul style={{ marginBottom: 0 }}>{insightQuery.data.warnings.map((warning) => (<li key={warning}>{warning}</li>))}</ul> : null}
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 0 }}>Fonte: {insightQuery.data?.source || 'n/a'} · confiança {(insightQuery.data?.confidence ?? 0).toFixed(2)}</p>
              </>
            )}
          </div>

          <div className="card details-chat-card">
            <h2 style={{ marginTop: 0 }}>Chat do documento</h2>
            <p style={{ color: '#64748b', marginTop: 0 }}>Pergunte sobre OCR/metadados. O contexto RAG é aplicado internamente no pipeline do chat.</p>
            {!isChatDisabled && ragContextQuery.data?.message ? (
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '-0.2rem' }}>{ragContextQuery.data.message}</p>
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
              {chatMutation.isError ? (
                <button type="button" className="button button--ghost" onClick={handleSendChat} disabled={isChatDisabled || chatMutation.isPending || !chatInput.trim()}>
                  Tentar novamente
                </button>
              ) : null}
            </div>
            {chatMutation.isError ? <p className="details-inline-hint" style={{ marginBottom: 0 }}>Não foi possível responder agora. Tente novamente em instantes.</p> : null}
            {chatMutation.data ? (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <p style={{ marginTop: 0, marginBottom: '0.5rem' }}><strong>Status:</strong> {chatMutation.data.status} · {chatMutation.data.message}</p>
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
