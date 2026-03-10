import { RAG_ROLLOUT_GUARDS, RagRolloutGuard } from '@/constants/ragRolloutGuard';

export const resolveRagRolloutGuardMessage = (guard?: RagRolloutGuard | string) => {
  switch (guard) {
    case RAG_ROLLOUT_GUARDS.FEATURE_FLAG_DISABLED:
      return 'RAG documental indisponível: feature flag global desativada.';
    case RAG_ROLLOUT_GUARDS.TENANT_NOT_ALLOWED:
      return 'RAG documental indisponível para este tenant no rollout atual.';
    case RAG_ROLLOUT_GUARDS.CATEGORY_NOT_ALLOWED:
      return 'RAG documental indisponível para esta categoria no rollout atual.';
    case RAG_ROLLOUT_GUARDS.REQUIRED_METADATA_MISSING:
      return 'RAG documental aguardando qualidade mínima: há metadados obrigatórios faltantes.';
    default:
      return undefined;
  }
};

export const resolveDocumentChatAssistantMessage = (payload: {
  answer?: string;
  ragRolloutGuardMessage?: string;
  rolloutGuard?: string;
  message?: string;
}) => {
  const trimmedAnswer = payload.answer?.trim();
  if (trimmedAnswer) {
    return trimmedAnswer;
  }

  const explicitGuardMessage = payload.ragRolloutGuardMessage?.trim();
  if (explicitGuardMessage) {
    return explicitGuardMessage;
  }

  return (
    resolveRagRolloutGuardMessage(payload.rolloutGuard) ||
    payload.message ||
    'Sem resposta no momento.'
  );
};
