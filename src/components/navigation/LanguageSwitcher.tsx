import { useTranslation } from '@/i18n';
import clsx from 'clsx';

const LANGUAGE_FLAGS: Record<string, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸'
};

const LANGUAGES: Array<{ code: string; labelKey: string }> = [
  { code: 'pt', labelKey: 'language.options.pt' },
  { code: 'en', labelKey: 'language.options.en' },
  { code: 'es', labelKey: 'language.options.es' }
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language || 'pt';

  const handleChange = (code: string) => {
    if (code === currentLanguage) {
      return;
    }
    i18n.changeLanguage(code);
  };

  return (
    <ul className="side-nav__list side-nav__list--languages">
      {LANGUAGES.map((language) => (
        <li key={language.code}>
          <button
            type="button"
            className={clsx('language-button', { 'language-button--active': currentLanguage.startsWith(language.code) })}
            onClick={() => handleChange(language.code)}
          >
            <span aria-hidden>{LANGUAGE_FLAGS[language.code]}</span>
            <span className="language-button__label">{t(language.labelKey)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
