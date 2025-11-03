import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{t('login.title')}</h1>
        <p>{t('login.description')}</p>
        <button
          type="button"
          style={{ marginTop: '1.5rem' }}
          className="login-button"
          onClick={login}
        >
          {t('login.redirecting')}
        </button>
      </div>
    </div>
  );
}
