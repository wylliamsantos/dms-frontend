import { useTranslation } from '@/i18n';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  const { t } = useTranslation();
  const resolvedMessage = message ?? t('common.loading');
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div className="loader" aria-label={resolvedMessage} />
      <span>{resolvedMessage}</span>
    </div>
  );
}
