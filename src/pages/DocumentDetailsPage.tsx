import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';

import { DocumentPreview } from '@/components/DocumentPreview';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MetadataPanel } from '@/components/MetadataPanel';
import { VersionList } from '@/components/VersionList';
import {
  useDocumentBase64,
  useDocumentBinary,
  useDocumentInformation,
  useDocumentVersions
} from '@/hooks/useDocumentDetails';
import { DmsDocumentSearchResponse, DmsEntry } from '@/types/document';

const formatDate = (iso?: string, locale = 'pt-BR') => {
  if (!iso) return undefined;
  const date = new Date(iso);
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
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>{entry?.name ?? t('details.untitled')}</h1>
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
            alignItems: 'flex-end',
            textAlign: 'right',
            minWidth: '18rem'
          }}
        >
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
        </div>
        <VersionList items={versionItems} activeVersion={activeVersion} onSelect={handleVersionSelect} />
      </div>
    </div>
  );
}
