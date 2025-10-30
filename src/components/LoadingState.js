import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from '@/i18n';
export function LoadingState({ message }) {
    const { t } = useTranslation();
    const resolvedMessage = message ?? t('common.loading');
    return (_jsxs("div", { className: "card", style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { className: "loader", "aria-label": resolvedMessage }), _jsx("span", { children: resolvedMessage })] }));
}
