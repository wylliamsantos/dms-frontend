import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from '@/i18n';
import { formatDateTime } from '@/utils/format';
export function VersionList({ items, activeVersion, onSelect }) {
    const { t } = useTranslation();
    if (!items.length) {
        return _jsx("div", { className: "card", children: t('versionList.empty') });
    }
    return (_jsxs("div", { className: "card", children: [_jsx("h2", { style: { marginTop: 0 }, children: t('versionList.title') }), _jsx("div", { className: "version-list", children: items.map((item) => {
                    const version = item.entry?.version;
                    const isActive = activeVersion ? version === activeVersion : false;
                    return (_jsxs("button", { type: "button", className: `version-item ${isActive ? 'version-item--active' : ''}`, onClick: () => onSelect(item), children: [_jsxs("div", { children: [_jsx("strong", { children: t('versionList.versionLabel', { version }) }), _jsx("div", { style: { fontSize: '0.8rem', color: '#64748b' }, children: t('versionList.metadata', {
                                            date: formatDateTime(item.entry?.modifiedAt) ?? '-',
                                            type: item.entry?.versionType ?? '-'
                                        }) })] }), _jsx("span", { className: "badge badge--muted", children: item.entry?.versionType })] }, version ?? Math.random()));
                }) })] }));
}
