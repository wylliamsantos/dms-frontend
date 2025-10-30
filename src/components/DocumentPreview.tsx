import { useMemo } from 'react';
import { useTranslation } from '@/i18n';

import { LoadingState } from '@/components/LoadingState';
import { DmsEntry } from '@/types/document';

interface DocumentPreviewProps {
  entry?: DmsEntry;
  base64?: string;
  objectUrl?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

function decodeBase64ToText(value: string): string | undefined {
  try {
    const binary = atob(value);
    if (typeof TextDecoder !== 'undefined') {
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return binary;
  } catch (error) {
    console.error('Erro ao decodificar conteúdo em texto', error);
    return undefined;
  }
}

export function DocumentPreview({ entry, base64, objectUrl, isLoading, isError, errorMessage }: DocumentPreviewProps) {
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
    return <div className="card">{t('preview.selectDocument')}</div>;
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t('preview.title')}</h2>
      {isLoading ? (
        <LoadingState message={t('common.loading')} />
      ) : isError ? (
        <div className="alert">{errorMessage ?? t('preview.loadError')}</div>
      ) : isText && textContent ? (
        <pre className="text-preview">{textContent}</pre>
      ) : dataUrl ? (
        isPdf ? (
          <iframe
            title="Pré-visualização do documento"
            src={dataUrl}
            style={{ width: '100%', height: '480px', border: '1px solid #cbd5f5', borderRadius: '0.5rem' }}
          />
        ) : isVideo ? (
          <video
            controls
            style={{ width: '100%', maxHeight: '480px', borderRadius: '0.5rem', backgroundColor: '#000' }}
          >
            <source src={dataUrl} type={mimeType} />
            {t('preview.videoFallback')}
          </video>
        ) : isImage ? (
          <img
            src={dataUrl}
            alt={entry.name ?? 'Pré-visualização'}
            style={{ maxWidth: '100%', borderRadius: '0.5rem' }}
          />
        ) : (
          <div className="alert">{t('preview.unsupported')}</div>
        )
      ) : (
        <div className="alert">{t('preview.loadError')}</div>
      )}
    </div>
  );
}
