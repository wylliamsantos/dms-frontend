import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from '@/i18n';
import clsx from 'clsx';
const LANGUAGE_FLAGS = {
    pt: '🇧🇷',
    en: '🇺🇸',
    es: '🇪🇸'
};
const LANGUAGES = [
    { code: 'pt', labelKey: 'language.options.pt' },
    { code: 'en', labelKey: 'language.options.en' },
    { code: 'es', labelKey: 'language.options.es' }
];
export function LanguageSwitcher() {
    const { i18n, t } = useTranslation();
    const currentLanguage = i18n.language || 'pt';
    const handleChange = (code) => {
        if (code === currentLanguage) {
            return;
        }
        i18n.changeLanguage(code);
    };
    return (_jsx("ul", { className: "side-nav__list side-nav__list--languages", children: LANGUAGES.map((language) => (_jsx("li", { children: _jsxs("button", { type: "button", className: clsx('language-button', { 'language-button--active': currentLanguage.startsWith(language.code) }), onClick: () => handleChange(language.code), children: [_jsx("span", { "aria-hidden": true, children: LANGUAGE_FLAGS[language.code] }), _jsx("span", { className: "language-button__label", children: t(language.labelKey) })] }) }, language.code))) }));
}
