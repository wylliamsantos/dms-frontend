import { describe, expect, it } from 'vitest';

import { RAG_ROLLOUT_GUARDS } from '@/constants/ragRolloutGuard';
import { resolveDocumentChatAssistantMessage, resolveRagRolloutGuardMessage } from '@/utils/ragRolloutGuard';

describe('ragRolloutGuard utils', () => {
  it('resolve mensagens canônicas por guard', () => {
    expect(resolveRagRolloutGuardMessage(RAG_ROLLOUT_GUARDS.FEATURE_FLAG_DISABLED)).toContain('feature flag global');
    expect(resolveRagRolloutGuardMessage(RAG_ROLLOUT_GUARDS.TENANT_NOT_ALLOWED)).toContain('tenant');
    expect(resolveRagRolloutGuardMessage(RAG_ROLLOUT_GUARDS.CATEGORY_NOT_ALLOWED)).toContain('categoria');
    expect(resolveRagRolloutGuardMessage(RAG_ROLLOUT_GUARDS.REQUIRED_METADATA_MISSING)).toContain('metadados obrigatórios');
    expect(resolveRagRolloutGuardMessage(RAG_ROLLOUT_GUARDS.NONE)).toBeUndefined();
  });

  it('prioriza answer explícita no chat', () => {
    expect(resolveDocumentChatAssistantMessage({
      answer: 'Resposta final',
      rolloutGuard: RAG_ROLLOUT_GUARDS.FEATURE_FLAG_DISABLED,
      message: 'fallback'
    })).toBe('Resposta final');
  });
});
