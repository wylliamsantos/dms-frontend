import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from '@/i18n';
export function ErrorState({ title, description, onRetry }) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('errors.defaultTitle');
    return (_jsxs("div", { className: "card alert", role: "alert", children: [_jsx("strong", { children: resolvedTitle }), description ? _jsx("p", { children: description }) : null, onRetry ? (_jsx("button", { className: "button button--primary", type: "button", onClick: onRetry, children: t('common.retry') })) : null] }));
}
