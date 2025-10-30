import { useTranslation } from '@/i18n';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('errors.defaultTitle');
  return (
    <div className="card alert" role="alert">
      <strong>{resolvedTitle}</strong>
      {description ? <p>{description}</p> : null}
      {onRetry ? (
        <button className="button button--primary" type="button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}
