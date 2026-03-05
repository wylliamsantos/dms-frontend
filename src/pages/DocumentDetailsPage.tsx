import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useQuery } from '@tanstack/react-query';

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
import { listWorkflowHistory } from '@/api/workflow';
import { DmsDocumentSearchResponse, DmsEntry } from '@/types/document';
import { formatDateTime } from '@/utils/format';
import { workflowStatusLabel } from '@/utils/labels';

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

export function DocumentDetailsPage() {
  const { documentId } = useParams();
  const [activeVersion, setActiveVersion] = useState<string | undefined>(undefined);
  const [entry, setEntry] = useState<DmsEntry | undefined>(undefined);
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
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
  const contentMimeType = entry?.content?.mimeType ?? '';
  const contentSize = entry?.content?.sizeInBytes ?? 0;
  const isVideo = contentMimeType.startsWith('video/');
  const MAX_BASE64_BYTES = 5 * 1024 * 1024; // 5MB
  const preferBinaryPreview = isVideo || contentSize >= MAX_BASE64_BYTES;

  const base64Query = useDocumentBase64(
    documentId,
    activeVersion,
    Boolean(entry) && !preferBinaryPreview
  );
  const binaryQuery = useDocumentBinary(
    documentId,
    activeVersion,
    Boolean(entry) && preferBinaryPreview
  );

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

  // audit filtering moved to dedicated admin page (/audit/history)

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

  const handleVersionSelect = (version: DmsDocumentSearchResponse) => {
    const newVersion = version.entry?.version;
    setActiveVersion(newVersion);
    if (version.entry) {
      setEntry(version.entry);
    }
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

  return (
    <div className="page-document-details">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>
          ← {t('details.back')}
        </Link>
      </div>

      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '16rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              color: '#6366f1'
            }}
          >
            {t('details.header.title')}
          </span>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a', wordBreak: 'break-all', lineHeight: 1.2 }}>{entry?.name ?? t('details.untitled')}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.95rem' }}>
            {entry?.category ? (
              <div>
                <span
                  style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}
                >
                  {t('details.header.category')}
                </span>
                <strong style={{ color: '#0f172a' }}>{entry.category}</strong>
              </div>
            ) : null}
            {createdAtLabel ? (
              <div>
                <span
                  style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}
                >
                  {t('details.header.createdAt')}
                </span>
                <span>{createdAtLabel}</span>
              </div>
            ) : null}
            {modifiedAtLabel ? (
              <div>
                <span
                  style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}
                >
                  {t('details.header.updatedAt')}
                </span>
                <span>{modifiedAtLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'flex-start',
            textAlign: 'left',
            minWidth: '16rem',
            flex: '1 1 320px'
          }}
        >
          {entry?.workflowStatus ? (
            <div style={{ color: '#475569', fontSize: '0.95rem' }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#94a3b8'
                }}
              >
                Status workflow
              </span>
              <strong style={{ color: '#0f172a' }}>{workflowStatusLabel(entry.workflowStatus)}</strong>
            </div>
          ) : null}

          {currentVersionLabel ? (
            <div style={{ color: '#475569', fontSize: '0.95rem' }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#94a3b8'
                }}
              >
                {t('details.header.version')}
              </span>
              <strong style={{ color: '#0f172a' }}>{currentVersionLabel}</strong>
            </div>
          ) : null}
          <div style={{ width: '100%' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#94a3b8',
                marginBottom: '0.25rem'
              }}
            >
              {t('details.header.identifier')}
            </span>
            <code
              style={{
                display: 'block',
                background: '#f1f5f9',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.9rem',
                color: '#0f172a',
                wordBreak: 'break-all'
              }}
            >
              {documentId}
            </code>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <MetadataPanel entry={entry} />

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Insights de IA (MVP)</h2>
            {insightQuery.isLoading ? (
              <p style={{ color: '#64748b' }}>Gerando insights...</p>
            ) : insightQuery.isError ? (
              <p style={{ color: '#b91c1c' }}>Não foi possível carregar insights neste momento.</p>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>{insightQuery.data?.summary || 'Sem resumo disponível para este documento.'}</p>
                {insightQuery.data?.keyMetadata && Object.keys(insightQuery.data.keyMetadata).length ? (
                  <div className="metadata-grid">
                    {Object.entries(insightQuery.data.keyMetadata).map(([key, value]) => (
                      <div className="metadata-item" key={key}>
                        <strong>{key}</strong>
                        <span>{value == null ? '-' : String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {insightQuery.data?.warnings?.length ? (
                  <ul style={{ marginBottom: 0 }}>
                    {insightQuery.data.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 0 }}>
                  Fonte: {insightQuery.data?.source || 'n/a'} · confiança {(insightQuery.data?.confidence ?? 0).toFixed(2)}
                </p>
              </>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>RAG por documento (skeleton)</h2>
            <p style={{ margin: 0, color: '#475569' }}>
              {ragContextQuery.data?.message || 'Carregando status do RAG...'}
            </p>
          </div>

          <VersionDiffPanel documentId={documentId} versions={versionItems} />
          <DocumentPreview
            entry={entry}
            base64={base64Query.data}
            objectUrl={objectUrl}
            isLoading={
              (preferBinaryPreview && (binaryQuery.isLoading || binaryQuery.isFetching)) ||
              (!preferBinaryPreview && (base64Query.isLoading || base64Query.isFetching))
            }
            isError={preferBinaryPreview ? binaryQuery.isError : base64Query.isError}
            errorMessage={
              preferBinaryPreview && binaryQuery.isError
                ? 'Não foi possível carregar o conteúdo a partir do armazenamento.'
                : undefined
            }
          />

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Timeline do documento</h2>
            {timelineEvents.length === 0 ? (
              <p style={{ color: '#64748b' }}>Sem eventos para exibir.</p>
            ) : (
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

          {/* auditoria dedicada movida para /audit/history (admin) */}
        </div>
        <VersionList items={versionItems} activeVersion={activeVersion} onSelect={handleVersionSelect} />
      </div>
    </div>
  );
}
