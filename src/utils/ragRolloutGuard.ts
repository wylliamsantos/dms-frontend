export const resolveRagRolloutGuardMessage = (guard?: string) => {
  switch (guard) {
    case 'FEATURE_FLAG_DISABLED':
      return 'RAG documental indisponível: feature flag global desativada.';
    case 'TENANT_NOT_ALLOWED':
      return 'RAG documental indisponível para este tenant no rollout atual.';
    case 'CATEGORY_NOT_ALLOWED':
      return 'RAG documental indisponível para esta categoria no rollout atual.';
    case 'REQUIRED_METADATA_MISSING':
      return 'RAG documental aguardando qualidade mínima: há metadados obrigatórios faltantes.';
    default:
      return undefined;
  }
};
