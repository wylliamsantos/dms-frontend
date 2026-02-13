import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import {
  listPendingWorkflow,
  PendingDocumentItem,
  reviewWorkflowDocument
} from '@/api/workflow';

const PAGE_SIZE = 20;

export function WorkflowPendingPage() {
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [page, setPage] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ['workflow-pending', category, author, page],
    queryFn: () =>
      listPendingWorkflow({
        category: category || undefined,
        author: author || undefined,
        page,
        size: PAGE_SIZE
      })
  });

  const reviewMutation = useMutation({
    mutationFn: ({ documentId, action, reason }: { documentId: string; action: 'APPROVE' | 'REPROVE'; reason?: string }) =>
      reviewWorkflowDocument(documentId, { action, reason }),
    onSuccess: () => {
      pendingQuery.refetch();
    }
  });

  const items = pendingQuery.data?.content ?? [];
  const totalPages = pendingQuery.data?.totalPages ?? 0;

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category).filter(Boolean));
    return Array.from(unique).sort();
  }, [items]);

  const handleApprove = async (item: PendingDocumentItem) => {
    setFeedback(null);
    await reviewMutation.mutateAsync({ documentId: item.documentId, action: 'APPROVE' });
    setFeedback(`Documento ${item.documentId} aprovado.`);
  };

  const handleReprove = async (item: PendingDocumentItem) => {
    const reason = window.prompt('Motivo da reprovação:');
    if (!reason || !reason.trim()) {
      setFeedback('Reprovação cancelada: motivo é obrigatório.');
      return;
    }
    setFeedback(null);
    await reviewMutation.mutateAsync({
      documentId: item.documentId,
      action: 'REPROVE',
      reason: reason.trim()
    });
    setFeedback(`Documento ${item.documentId} reprovado.`);
  };

  if (pendingQuery.isLoading) {
    return <LoadingState message="Carregando fila de pendências" />;
  }

  if (pendingQuery.isError) {
    return (
      <ErrorState
        title="Erro ao carregar pendências"
        description="Não foi possível consultar a fila de revisão."
        onRetry={() => pendingQuery.refetch()}
      />
    );
  }

  return (
    <div className="page-search">
      <section className="card">
        <header style={{ marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>Pendências de revisão</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
            Revise e aprove/reprove documentos em PENDING_REVIEW.
          </p>
        </header>

        <div className="form-grid form-grid--two" style={{ marginBottom: '1rem' }}>
          <div className="input-group">
            <label htmlFor="pending-category">Categoria</label>
            <select
              id="pending-category"
              className="select-input"
              value={category}
              onChange={(event) => {
                setPage(0);
                setCategory(event.target.value);
              }}
            >
              <option value="">Todas</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="pending-author">Autor</label>
            <input
              id="pending-author"
              className="text-input"
              value={author}
              placeholder="Filtrar por autor"
              onChange={(event) => {
                setPage(0);
                setAuthor(event.target.value);
              }}
            />
          </div>
        </div>

        {feedback ? <div className="card" style={{ marginBottom: '1rem' }}>{feedback}</div> : null}

        {reviewMutation.isError ? (
          <ErrorState title="Ação de revisão falhou" description="Não foi possível completar a ação." />
        ) : null}

        {items.length === 0 ? (
          <div className="card">Nenhum documento pendente com os filtros atuais.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Versão</th>
                <th>Autor</th>
                <th>Atualizado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.documentId}>
                  <td>{item.filename || item.documentId}</td>
                  <td>{item.category}</td>
                  <td>{item.currentVersion || '-'}</td>
                  <td>{item.author || '-'}</td>
                  <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleString('pt-BR') : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="button button--primary"
                        disabled={reviewMutation.isPending}
                        onClick={() => handleApprove(item)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        disabled={reviewMutation.isPending}
                        onClick={() => handleReprove(item)}
                      >
                        Reprovar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 ? (
          <div className="pagination" style={{ marginTop: '1rem' }}>
            <div className="pagination__controls">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={page === 0}
              >
                Anterior
              </button>
              <span className="pagination__page">Página {page + 1} de {totalPages}</span>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
                disabled={page >= totalPages - 1}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
