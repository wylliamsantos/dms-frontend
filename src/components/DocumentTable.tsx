import { ReactNode } from 'react';
import { useTranslation } from '@/i18n';

import { SearchEntry } from '@/types/document';
import { formatDateTime } from '@/utils/format';

interface DocumentTableProps {
  items: SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
  footer?: ReactNode;
}

export function DocumentTable({ items, onSelect, footer }: DocumentTableProps) {
  const { t } = useTranslation();
  if (!items.length) {
    return <div className="card">{t('table.empty')}</div>;
  }

  return (
    <div className="card">
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('table.columns.document')}</th>
              <th>{t('table.columns.category')}</th>
              <th>{t('table.columns.lastVersion')}</th>
              <th>{t('table.columns.updatedAt')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <div>{entry.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{entry.location}</div>
                </td>
                <td>{entry.nodeType}</td>
                <td>
                  <span className="badge badge--muted">{entry.versionType ?? 'MAJOR'}</span>
                  <span style={{ marginLeft: '0.5rem' }}>{entry.version ?? '-'}</span>
                </td>
                <td>{formatDateTime(entry.modifiedAt) ?? '-'}</td>
                <td>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => onSelect(entry)}
                  >
                    {t('table.actions.details')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="table-footer">{footer}</div> : null}
    </div>
  );
}
