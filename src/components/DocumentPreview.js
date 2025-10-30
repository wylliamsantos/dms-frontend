import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { LoadingState } from '@/components/LoadingState';
function decodeBase64ToText(value) {
    try {
        const binary = atob(value);
        if (typeof TextDecoder !== 'undefined') {
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            return new TextDecoder().decode(bytes);
        }
        return binary;
    }
    catch (error) {
        console.error('Erro ao decodificar conteúdo em texto', error);
        return undefined;
    }
}
export function DocumentPreview({ entry, base64, objectUrl, isLoading, isError, errorMessage }) {
    const { t } = useTranslation();
    const mimeType = entry?.content?.mimeType ?? '';
    const isPdf = mimeType.includes('pdf');
    const isImage = mimeType.startsWith('image/');
    const isText = mimeType.startsWith('text/');
    const isVideo = mimeType.startsWith('video/');
    const dataUrl = useMemo(() => {
        if (objectUrl) {
            return objectUrl;
        }
        if (!base64 || !mimeType || isText) {
            return undefined;
        }
        return `data:${mimeType};base64,${base64}`;
    }, [base64, mimeType, isText, objectUrl]);
    const textContent = useMemo(() => {
        if (!isText || !base64) {
            return undefined;
        }
        return decodeBase64ToText(base64);
    }, [isText, base64]);
    if (!entry) {
        return _jsx("div", { className: "card", children: t('preview.selectDocument') });
    }
    return (_jsxs("div", { className: "card", children: [_jsx("h2", { style: { marginTop: 0 }, children: t('preview.title') }), isLoading ? (_jsx(LoadingState, { message: t('common.loading') })) : isError ? (_jsx("div", { className: "alert", children: errorMessage ?? t('preview.loadError') })) : isText && textContent ? (_jsx("pre", { className: "text-preview", children: textContent })) : dataUrl ? (isPdf ? (_jsx("iframe", { title: "Pr\u00E9-visualiza\u00E7\u00E3o do documento", src: dataUrl, style: { width: '100%', height: '480px', border: '1px solid #cbd5f5', borderRadius: '0.5rem' } })) : isVideo ? (_jsxs("video", { controls: true, style: { width: '100%', maxHeight: '480px', borderRadius: '0.5rem', backgroundColor: '#000' }, children: [_jsx("source", { src: dataUrl, type: mimeType }), t('preview.videoFallback')] })) : isImage ? (_jsx("img", { src: dataUrl, alt: entry.name ?? 'Pré-visualização', style: { maxWidth: '100%', borderRadius: '0.5rem' } })) : (_jsx("div", { className: "alert", children: t('preview.unsupported') }))) : (_jsx("div", { className: "alert", children: t('preview.loadError') }))] }));
}
