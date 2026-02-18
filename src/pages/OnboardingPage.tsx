import axios from 'axios';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { bootstrapOnboarding, OnboardingBootstrapResponse } from '@/api/document';

const DEFAULT_CATEGORY = 'GERAL';

const extractErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as Record<string, unknown>).message;
      if (typeof message === 'string') {
        return message;
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível inicializar o onboarding no backend.';
};

export function OnboardingPage() {
  const [initialCategoryName, setInitialCategoryName] = useState(DEFAULT_CATEGORY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bootstrapResult, setBootstrapResult] = useState<OnboardingBootstrapResponse | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const handleBootstrap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCategory = initialCategoryName.trim();

    if (!normalizedCategory) {
      setBootstrapError('Informe o nome da categoria inicial.');
      return;
    }

    setIsSubmitting(true);
    setBootstrapError(null);

    try {
      const response = await bootstrapOnboarding({
        initialCategoryName: normalizedCategory,
        createDefaultCategory: true
      });
      setBootstrapResult(response);
    } catch (error) {
      setBootstrapResult(null);
      setBootstrapError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <header className="page-header">
        <h1>Onboarding inicial</h1>
        <p>
          Complete este fluxo guiado para deixar o tenant pronto sem suporte manual e chegar ao
          primeiro documento publicado.
        </p>
      </header>

      <div className="category-page__content" style={{ gap: '1rem' }}>
        <article className="card">
          <h2>1) Inicializar tenant no backend</h2>
          <p>
            Execute o bootstrap para validar o owner autenticado e criar automaticamente a primeira
            categoria caso o tenant ainda esteja vazio.
          </p>

          <form onSubmit={handleBootstrap} style={{ display: 'grid', gap: '0.75rem', maxWidth: '28rem' }}>
            <label htmlFor="initialCategoryName" style={{ fontWeight: 600 }}>
              Categoria inicial
            </label>
            <input
              id="initialCategoryName"
              type="text"
              value={initialCategoryName}
              onChange={(event) => setInitialCategoryName(event.target.value)}
              placeholder="Ex.: GERAL"
              disabled={isSubmitting}
            />
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Inicializando…' : 'Executar bootstrap'}
            </button>
          </form>

          {bootstrapResult ? (
            <div className="card card--success" style={{ marginTop: '1rem' }}>
              <strong>Bootstrap concluído</strong>
              <ul style={{ margin: '0.5rem 0 0 1rem' }}>
                <li>Tenant: {bootstrapResult.tenantId}</li>
                <li>Owner: {bootstrapResult.ownerUsername}</li>
                <li>
                  Categorias: {bootstrapResult.categoriesBefore} → {bootstrapResult.categoriesAfter}
                </li>
                <li>
                  Categoria criada:{' '}
                  {bootstrapResult.createdDefaultCategory
                    ? bootstrapResult.createdCategoryName ?? 'sim'
                    : 'não (tenant já possuía categorias)'}
                </li>
              </ul>
            </div>
          ) : null}

          {bootstrapError ? (
            <div className="card card--error" style={{ marginTop: '1rem' }}>
              {bootstrapError}
            </div>
          ) : null}
        </article>

        <article className="card">
          <h2>2) Revisar categorias base</h2>
          <p>Cadastre/ajuste as categorias necessárias para iniciar a operação e o schema mínimo.</p>
          <Link to="/categories">Ir para gerenciamento de categorias</Link>
        </article>

        <article className="card">
          <h2>3) Publicar primeiro documento</h2>
          <p>
            Faça um upload inicial para validar ponta-a-ponta (ingestão, indexação e consulta).
          </p>
          <Link to="/documents/new">Ir para novo documento</Link>
        </article>

        <article className="card">
          <h2>4) Validar consulta</h2>
          <p>
            Após o upload, use a tela de consulta para confirmar recuperação do documento no tenant
            correto.
          </p>
          <Link to="/">Ir para consulta</Link>
        </article>
      </div>
    </section>
  );
}
