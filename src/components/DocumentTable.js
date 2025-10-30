import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from '@/i18n';
import { formatDateTime } from '@/utils/format';
export function DocumentTable({ items, onSelect, footer }) {
    const { t } = useTranslation();
    if (!items.length) {
        return _jsx("div", { className: "card", children: t('table.empty') });
    }
    return (_jsxs("div", { className: "card", children: [_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('table.columns.document') }), _jsx("th", { children: t('table.columns.category') }), _jsx("th", { children: t('table.columns.lastVersion') }), _jsx("th", { children: t('table.columns.updatedAt') }), _jsx("th", {})] }) }), _jsx("tbody", { children: items.map((entry) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("div", { children: entry.name }), _jsx("div", { style: { fontSize: '0.8rem', color: '#64748b' }, children: entry.location })] }), _jsx("td", { children: entry.nodeType }), _jsxs("td", { children: [_jsx("span", { className: "badge badge--muted", children: entry.versionType ?? 'MAJOR' }), _jsx("span", { style: { marginLeft: '0.5rem' }, children: entry.version ?? '-' })] }), _jsx("td", { children: formatDateTime(entry.modifiedAt) ?? '-' }), _jsx("td", { children: _jsx("button", { className: "button button--primary", type: "button", onClick: () => onSelect(entry), children: t('table.actions.details') }) })] }, entry.id))) })] }) }), footer ? _jsx("div", { className: "table-footer", children: footer }) : null] }));
}
