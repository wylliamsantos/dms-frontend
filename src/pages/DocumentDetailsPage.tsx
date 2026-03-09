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
  useDocumentVersions
} from '@/hooks/useDocumentDetails';
import { chatByDocument } from '@/api/document';
import { listWorkflowHistory } from '@/api/workflow';
import { DmsDocumentSearchResponse, DmsEntry } from '@/types/document';
import { formatDateTime } from '@/utils/format';
import { env } from '@/utils/env';
import { workflowStatusClassName, workflowStatusLabel } from '@/utils/labels';
import { resolveDocumentChatAssistantMessage } from '@/utils/ragRolloutGuard';

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
  const { t, i18n } = useTranslation();

  const informationQuery = useDocumentInformation(documentId, activeVersion);
  const versionsQuery = useDocumentVersions(documentId);
  const workflowHistoryQuery = useQuery({
    queryKey: ['workflow-history', documentId],
    queryFn: () => listWorkflowHistory(documentId as string),
    enabled: Boolean(documentId)
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
      const answer = resolveDocumentChatAssistantMessage(response);
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
