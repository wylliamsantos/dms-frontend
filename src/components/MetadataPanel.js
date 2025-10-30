import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from '@/i18n';
import { formatBytes, formatDateTime, formatCpf } from '@/utils/format';
export function MetadataPanel({ entry }) {
    const { t } = useTranslation();
    if (!entry) {
        return _jsx("div", { className: "card", children: t('metadataPanel.noData') });
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
    const formatMetadataValue = (key, value) => {
        if (value === null || typeof value === 'undefined')
            return '-';
        const rawValue = Array.isArray(value)
            ? value.map((item) => String(item)).join(', ')
            : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
        return key.trim().toLowerCase() === 'cpf' ? formatCpf(rawValue) : rawValue;
    };
    return (_jsxs("div", { className: "card", children: [_jsx("h2", { style: { marginTop: 0 }, children: t('metadataPanel.title') }), _jsx("div", { className: "metadata-grid", children: baseFields
                    .filter((field) => field.value)
                    .map((field) => (_jsxs("div", { className: "metadata-item", children: [_jsx("strong", { children: field.label }), _jsx("span", { children: field.value })] }, field.label))) }), metadataEntries.length ? (_jsxs("div", { style: { marginTop: '1rem' }, children: [_jsx("h3", { children: t('metadataPanel.sectionTitle') }), _jsx("div", { className: "metadata-grid", children: metadataEntries.map(([key, value]) => (_jsxs("div", { className: "metadata-item", children: [_jsx("strong", { children: key }), _jsx("span", { children: formatMetadataValue(key, value) })] }, key))) })] })) : null] }));
}
