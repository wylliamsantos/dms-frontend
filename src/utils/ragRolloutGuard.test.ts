import { describe, expect, it } from 'vitest';

import { resolveDocumentChatAssistantMessage } from './ragRolloutGuard';

describe('resolveDocumentChatAssistantMessage', () => {
  it('prioriza answer quando presente', () => {
    const message = resolveDocumentChatAssistantMessage({
      answer: '  resposta final  ',
      ragRolloutGuardMessage: 'guard explícito',
      rolloutGuard: 'TENANT_NOT_ALLOWED',
      message: 'fallback geral'
    });

    expect(message).toBe('resposta final');
  });

  it('usa ragRolloutGuardMessage explícita quando answer está vazio', () => {
    const message = resolveDocumentChatAssistantMessage({
      answer: '   ',
      ragRolloutGuardMessage: 'RAG bloqueado por rollout gradual.',
      rolloutGuard: 'TENANT_NOT_ALLOWED',
      message: 'fallback geral'
    });

    expect(message).toBe('RAG bloqueado por rollout gradual.');
  });

  it('usa fallback por rolloutGuard quando não há mensagem explícita', () => {
    const message = resolveDocumentChatAssistantMessage({
      rolloutGuard: 'FEATURE_FLAG_DISABLED'
    });

    expect(message).toBe('RAG documental indisponível: feature flag global desativada.');
  });

  it('cai para message quando não há guard message resolvida', () => {
    const message = resolveDocumentChatAssistantMessage({
      answer: ' ',
      ragRolloutGuardMessage: ' ',
      rolloutGuard: 'NONE',
      message: 'fallback backend'
    });

    expect(message).toBe('fallback backend');
  });

  it('retorna fallback padrão quando payload vem vazio', () => {
    const message = resolveDocumentChatAssistantMessage({});

    expect(message).toBe('Sem resposta no momento.');
  });
});
