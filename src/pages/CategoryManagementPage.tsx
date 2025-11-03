import axios from 'axios';
import { useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';

import { CategoryForm } from '@/components/category/CategoryForm';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCategories } from '@/hooks/useCategories';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategoryMutations';
import { CategoryPayload, DocumentCategory } from '@/types/document';
import { useAuth } from '@/context/AuthContext';

type FormMode = 'create' | 'edit' | 'duplicate';

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
};

const defaultSchema = {} as Record<string, unknown>;

const isCategoryActive = (category: DocumentCategory | null | undefined) => {
  if (!category) {
    return true;
  }

  return category.active !== false;
};

const buildPayloadFromCategory = (
  category: DocumentCategory,
  overrides?: Partial<CategoryPayload>
): CategoryPayload => ({
  name: category.name ?? '',
  title: category.title,
  description: category.description,
  documentGroup: category.documentGroup,
  uniqueAttributes: category.uniqueAttributes,
  validityInDays: category.validityInDays as number | undefined,
  schema: (category.schema as Record<string, unknown> | undefined) ?? defaultSchema,
  types: category.types ?? [],
  active: overrides?.active ?? category.active ?? true,
  ...overrides
});

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string') {
      return (data as any).message as string;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export function CategoryManagementPage() {
  const categoriesQuery = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const categories = useMemo(() => {
    const items = categoriesQuery.data ?? [];
    return [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [categoriesQuery.data]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const closeForm = () => {
    setFormMode(null);
    setSelectedCategory(null);
  };

  const handleCreateClick = () => {
    setFeedback(null);
    setSelectedCategory(null);
    setFormMode('create');
  };

  const handleEditClick = (category: DocumentCategory) => {
    setFeedback(null);
    setSelectedCategory(category);
    setFormMode('edit');
  };

  const handleDuplicateClick = (category: DocumentCategory) => {
    setFeedback(null);
    setSelectedCategory(category);
    setFormMode('duplicate');
  };

  const handleToggleActive = (category: DocumentCategory) => {
    if (!category.id) {
      return;
    }

    setFeedback(null);
    const currentActive = isCategoryActive(category);
    const payload = buildPayloadFromCategory(category, { active: !currentActive });

    updateMutation.mutate(
      { id: category.id, payload },
      {
        onSuccess: () => {
          setFeedback({
            type: 'success',
            message: currentActive
              ? t('categoriesPage.feedback.deactivated')
              : t('categoriesPage.feedback.reactivated')
          });
        },
        onError: (error) => {
          setFeedback({
            type: 'error',
            message: extractErrorMessage(error, t('categoriesPage.feedback.toggleError'))
          });
        }
      }
    );
  };

  const handleSubmit = (payload: CategoryPayload) => {
    if (formMode === 'edit' && selectedCategory?.id) {
      updateMutation.mutate(
        { id: selectedCategory.id, payload },
        {
          onSuccess: () => {
            setFeedback({ type: 'success', message: t('categoriesPage.feedback.updated') });
            closeForm();
          },
          onError: (error) => {
            setFeedback({
              type: 'error',
              message: extractErrorMessage(error, t('categoriesPage.feedback.updateError'))
            });
          }
        }
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setFeedback({ type: 'success', message: t('categoriesPage.feedback.created') });
        closeForm();
      },
      onError: (error) => {
        setFeedback({
          type: 'error',
          message: extractErrorMessage(error, t('categoriesPage.feedback.createError'))
        });
      }
    });
  };

  if (!hasRole('ROLE_ADMIN')) {
    return (
      <ErrorState
        title="Acesso negado"
        description="Você não tem permissão para gerenciar categorias."
      />
    );
  }

  if (categoriesQuery.isLoading) {
    return <LoadingState message={t('search.loadingCategories')} />;
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        title={t('categoriesPage.error.title')}
        description={t('categoriesPage.error.description')}
        onRetry={() => categoriesQuery.refetch()}
      />
    );
  }

  const showForm = formMode !== null;

  return (
    <div className="page-categories">
      <section className="card" style={{ marginBottom: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>{t('categoriesPage.title')}</h1>
            <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>{t('categoriesPage.subtitle')}</p>
          </div>
          <button
            className="button button--primary"
            type="button"
            onClick={handleCreateClick}
            disabled={isSubmitting}
          >
            {t('categoriesPage.new')}
          </button>
        </header>
      </section>

      {feedback ? (
        <div className={`card ${feedback.type === 'error' ? 'card--error' : 'card--success'}`} style={{ marginBottom: '1rem' }}>
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {showForm ? (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <CategoryForm
            mode={formMode!}
            initialData={selectedCategory}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
          />
        </section>
      ) : null}

      <section className="card">
        <header style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{t('categoriesPage.table.title')}</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>{t('categoriesPage.table.subtitle')}</p>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('categoriesPage.table.headers.name')}</th>
                <th>{t('categoriesPage.table.headers.title')}</th>
                <th>{t('categoriesPage.table.headers.group')}</th>
                <th>{t('categoriesPage.table.headers.status')}</th>
                <th>{t('categoriesPage.table.headers.types')}</th>
                <th>{t('categoriesPage.table.headers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id ?? category.name}>
                  <td>{category.name}</td>
                  <td>{category.title ?? '—'}</td>
                  <td>{category.documentGroup ?? '—'}</td>
                  <td>
                    <span className={`badge ${isCategoryActive(category) ? 'badge--success' : 'badge--muted'}`}>
                      {isCategoryActive(category)
                        ? t('categoriesPage.table.status.active')
                        : t('categoriesPage.table.status.inactive')}
                    </span>
                  </td>
                  <td>{category.types?.length ?? 0}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="link-button" onClick={() => handleEditClick(category)}>
                        {t('categoriesPage.table.actions.edit')}
                      </button>
                      <button type="button" className="link-button" onClick={() => handleDuplicateClick(category)}>
                        {t('categoriesPage.table.actions.duplicate')}
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleToggleActive(category)}
                        disabled={isSubmitting}
                      >
                        {isCategoryActive(category)
                          ? t('categoriesPage.table.actions.deactivate')
                          : t('categoriesPage.table.actions.reactivate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                    {t('categoriesPage.table.empty')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
