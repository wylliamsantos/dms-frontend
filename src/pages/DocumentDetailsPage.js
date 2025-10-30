import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { DocumentPreview } from '@/components/DocumentPreview';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MetadataPanel } from '@/components/MetadataPanel';
import { VersionList } from '@/components/VersionList';
import { useDocumentBase64, useDocumentBinary, useDocumentInformation, useDocumentVersions } from '@/hooks/useDocumentDetails';
const formatDate = (iso, locale = 'pt-BR') => {
    if (!iso)
        return undefined;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return undefined;
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
    const [activeVersion, setActiveVersion] = useState(undefined);
    const [entry, setEntry] = useState(undefined);
    const [objectUrl, setObjectUrl] = useState(undefined);
    const { t, i18n } = useTranslation();
    const informationQuery = useDocumentInformation(documentId, activeVersion);
    const versionsQuery = useDocumentVersions(documentId);
    const contentMimeType = entry?.content?.mimeType ?? '';
    const contentSize = entry?.content?.sizeInBytes ?? 0;
    const isVideo = contentMimeType.startsWith('video/');
    const MAX_BASE64_BYTES = 5 * 1024 * 1024; // 5MB
    const preferBinaryPreview = isVideo || contentSize >= MAX_BASE64_BYTES;
    const base64Query = useDocumentBase64(documentId, activeVersion, Boolean(entry) && !preferBinaryPreview);
    const binaryQuery = useDocumentBinary(documentId, activeVersion, Boolean(entry) && preferBinaryPreview);
    useEffect(() => {
        if (informationQuery.data?.entry) {
            setEntry(informationQuery.data.entry);
            if (!activeVersion) {
                setActiveVersion(informationQuery.data.entry.version);
            }
        }
    }, [informationQuery.data?.entry?.id, informationQuery.data?.entry?.version]);
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
    }, [binaryQuery.data, contentMimeType, preferBinaryPreview]);
    const versionItems = useMemo(() => versionsQuery.data?.list?.content ?? [], [versionsQuery.data?.list?.content]);
    const handleVersionSelect = (version) => {
        const newVersion = version.entry?.version;
        setActiveVersion(newVersion);
        if (version.entry) {
            setEntry(version.entry);
        }
    };
    if (!documentId) {
        return _jsx(ErrorState, { title: t('details.invalidTitle'), description: t('details.invalidDescription') });
    }
    if (informationQuery.isLoading || versionsQuery.isLoading) {
        return _jsx(LoadingState, { message: t('details.loading') });
    }
    if (informationQuery.isError || versionsQuery.isError) {
        return (_jsx(ErrorState, { description: t('details.errorDescription'), onRetry: () => {
                informationQuery.refetch();
                versionsQuery.refetch();
            } }));
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
    return (_jsxs("div", { className: "page-document-details", children: [_jsx("div", { style: { marginBottom: '1rem' }, children: _jsxs(Link, { to: "/", style: { color: '#2563eb', textDecoration: 'none' }, children: ["\u2190 ", t('details.back')] }) }), _jsxs("div", { className: "card", style: {
                    marginBottom: '1rem',
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '16rem' }, children: [_jsx("span", { style: {
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontWeight: 600,
                                    color: '#6366f1'
                                }, children: t('details.header.title') }), _jsx("h1", { style: { margin: 0, fontSize: '1.75rem', color: '#0f172a' }, children: entry?.name ?? t('details.untitled') }), _jsxs("div", { style: { display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.95rem' }, children: [entry?.category ? (_jsxs("div", { children: [_jsx("span", { style: { display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }, children: t('details.header.category') }), _jsx("strong", { style: { color: '#0f172a' }, children: entry.category })] })) : null, createdAtLabel ? (_jsxs("div", { children: [_jsx("span", { style: { display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }, children: t('details.header.createdAt') }), _jsx("span", { children: createdAtLabel })] })) : null, modifiedAtLabel ? (_jsxs("div", { children: [_jsx("span", { style: { display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }, children: t('details.header.updatedAt') }), _jsx("span", { children: modifiedAtLabel })] })) : null] })] }), _jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            alignItems: 'flex-end',
                            textAlign: 'right',
                            minWidth: '18rem'
                        }, children: [currentVersionLabel ? (_jsxs("div", { style: { color: '#475569', fontSize: '0.95rem' }, children: [_jsx("span", { style: {
                                            display: 'block',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: '#94a3b8'
                                        }, children: t('details.header.version') }), _jsx("strong", { style: { color: '#0f172a' }, children: currentVersionLabel })] })) : null, _jsxs("div", { style: { width: '100%' }, children: [_jsx("span", { style: {
                                            display: 'block',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: '#94a3b8',
                                            marginBottom: '0.25rem'
                                        }, children: t('details.header.identifier') }), _jsx("code", { style: {
                                            display: 'block',
                                            background: '#f1f5f9',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            fontSize: '0.9rem',
                                            color: '#0f172a',
                                            wordBreak: 'break-all'
                                        }, children: documentId })] })] })] }), _jsxs("div", { style: { display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }, children: [_jsx(MetadataPanel, { entry: entry }), _jsx(DocumentPreview, { entry: entry, base64: base64Query.data, objectUrl: objectUrl, isLoading: (preferBinaryPreview && (binaryQuery.isLoading || binaryQuery.isFetching)) ||
                                    (!preferBinaryPreview && (base64Query.isLoading || base64Query.isFetching)), isError: preferBinaryPreview ? binaryQuery.isError : base64Query.isError, errorMessage: preferBinaryPreview && binaryQuery.isError
                                    ? 'Não foi possível carregar o conteúdo a partir do armazenamento.'
                                    : undefined })] }), _jsx(VersionList, { items: versionItems, activeVersion: activeVersion, onSelect: handleVersionSelect })] })] }));
}
