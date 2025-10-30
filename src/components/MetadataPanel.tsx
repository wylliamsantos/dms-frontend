import { useTranslation } from '@/i18n';

import { DmsEntry } from '@/types/document';
import { formatBytes, formatDateTime, formatCpf } from '@/utils/format';

interface MetadataPanelProps {
  entry?: DmsEntry;
}

export function MetadataPanel({ entry }: MetadataPanelProps) {
  const { t } = useTranslation();
  if (!entry) {
    return <div className="card">{t('metadataPanel.noData')}</div>;
  }

  const baseFields = [
    { label: t('metadataPanel.fields.name'), value: entry.name },
    { label: t('metadataPanel.fields.category'), value: entry.category },
    { label: t('metadataPanel.fields.createdAt'), value: formatDateTime(entry.createdAt) },
    { label: t('metadataPanel.fields.updatedAt'), value: formatDateTime(entry.modifiedAt) },
    { label: t('metadataPanel.fields.version'), value: entry.version },
    { label: t('metadataPanel.fields.versionType'), value: entry.versionType },
    { label: t('metadataPanel.fields.size'), value: formatBytes(entry.content?.sizeInBytes) },
    { label: t('metadataPanel.fields.mime'), value: entry.content?.mimeType }
  ];

  const metadataEntries = Object.entries(entry.properties ?? {});

  const formatMetadataValue = (key: string, value: unknown) => {
    if (value === null || typeof value === 'undefined') return '-';
    const rawValue = Array.isArray(value)
      ? value.map((item) => String(item)).join(', ')
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    return key.trim().toLowerCase() === 'cpf' ? formatCpf(rawValue) : rawValue;
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t('metadataPanel.title')}</h2>
      <div className="metadata-grid">
        {baseFields
          .filter((field) => field.value)
          .map((field) => (
            <div className="metadata-item" key={field.label}>
              <strong>{field.label}</strong>
              <span>{field.value as string}</span>
            </div>
          ))}
      </div>

      {metadataEntries.length ? (
        <div style={{ marginTop: '1rem' }}>
          <h3>{t('metadataPanel.sectionTitle')}</h3>
          <div className="metadata-grid">
            {metadataEntries.map(([key, value]) => (
              <div className="metadata-item" key={key}>
                <strong>{key}</strong>
                <span>{formatMetadataValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
