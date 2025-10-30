import { useTranslation } from '@/i18n';

import { DmsDocumentSearchResponse } from '@/types/document';
import { formatDateTime } from '@/utils/format';

interface VersionListProps {
  items: DmsDocumentSearchResponse[];
  activeVersion?: string;
  onSelect: (version: DmsDocumentSearchResponse) => void;
}

export function VersionList({ items, activeVersion, onSelect }: VersionListProps) {
  const { t } = useTranslation();
  if (!items.length) {
    return <div className="card">{t('versionList.empty')}</div>;
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t('versionList.title')}</h2>
      <div className="version-list">
        {items.map((item) => {
          const version = item.entry?.version;
          const isActive = activeVersion ? version === activeVersion : false;

          return (
            <button
              type="button"
              key={version ?? Math.random()}
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
    </div>
  );
}
