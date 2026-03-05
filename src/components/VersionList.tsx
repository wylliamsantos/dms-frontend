import { useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';

import { DmsDocumentSearchResponse } from '@/types/document';
import { formatDateTime } from '@/utils/format';

interface VersionListProps {
  items: DmsDocumentSearchResponse[];
  activeVersion?: string;
  onSelect: (version: DmsDocumentSearchResponse) => void;
}

const PAGE_SIZE = 10;

export function VersionList({ items, activeVersion, onSelect }: VersionListProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pagedItems = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

  if (!items.length) {
    return <div className="card version-list-card">{t('versionList.empty')}</div>;
  }

  return (
    <div className="card version-list-card">
      <h2 style={{ marginTop: 0 }}>{t('versionList.title')}</h2>
      <div className="version-list">
        {pagedItems.map((item, index) => {
          const version = item.entry?.version;
          const isActive = activeVersion ? version === activeVersion : false;

          return (
            <button
              type="button"
              key={version ?? `${safePage}-${index}`}
              className={`version-item ${isActive ? 'version-item--active' : ''}`}
              onClick={() => onSelect(item)}
            >
              <div>
                <strong>{t('versionList.versionLabel', { version })}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {t('versionList.metadata', {
                    date: formatDateTime(item.entry?.modifiedAt) ?? '-',
                    type: item.entry?.versionType ?? '-'
                  })}
                </div>
              </div>
              <span className="badge badge--muted">{item.entry?.versionType}</span>
            </button>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="pagination" style={{ marginTop: '0.75rem' }}>
          <div className="pagination__controls">
            <button type="button" className="button button--ghost" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={safePage === 0}>
              Anterior
            </button>
            <span className="pagination__page">Página {safePage + 1} de {totalPages}</span>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
              disabled={safePage >= totalPages - 1}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
