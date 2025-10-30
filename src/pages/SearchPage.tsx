import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';

import { setAuthToken, setTransactionId } from '@/api/client';
import { useCategories } from '@/hooks/useCategories';
import { useSearchByCpf } from '@/hooks/useSearchByCpf';
import { DocumentTable } from '@/components/DocumentTable';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { env } from '@/utils/env';
import { formatCpf, unmaskCpf } from '@/utils/format';
import { PageResponse, SearchEntry } from '@/types/document';

const PAGE_SIZE = 10;
const DEFAULT_VERSION_TYPE: 'ALL' = 'ALL';

interface FiltersForm {
  cpf: string;
  categories: string[];
}

export function SearchPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<PageResponse<SearchEntry> | null>(null);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { isSubmitting }
  } = useForm<FiltersForm>({
    defaultValues: {
      cpf: '',
      categories: []
    }
  });

  const cpfRegister = register('cpf', {
    required: true,
    onChange: (event) => {
      const formatted = formatCpf(event.target.value);
      if (formatted !== event.target.value) {
        setValue('cpf', formatted, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      }
    }
  });

  const categoriesQuery = useCategories();
  const searchMutation = useSearchByCpf();

  useEffect(() => {
    setTransactionId(env.defaultTransactionId);
    if (env.defaultAuthorization) {
      setAuthToken(env.defaultAuthorization);
    }
  }, []);

  const submitWithPage = (pageNumber: number, formValues?: FiltersForm) => {
    const values = formValues ?? getValues();
    const payload = {
      cpf: unmaskCpf(values.cpf),
      documentCategoryNames: values.categories ?? [],
      versionType: DEFAULT_VERSION_TYPE,
      page: pageNumber,
      size: PAGE_SIZE
    };

    searchMutation.mutate(payload, {
      onSuccess: (data) => {
        setResults(data);
      }
    });
  };

  const onSubmit = handleSubmit((values) => {
    submitWithPage(0, values);
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const selectedCategories = watch('categories');

  useEffect(() => {
    if (categories.length && !selectedCategories?.length) {
      setValue('categories', categories.map((category) => category.name));
    }
  }, [categories, selectedCategories?.length, setValue]);

  const handleDocumentSelect = (entry: SearchEntry) => {
    if (!entry.id) return;
    navigate(`/documents/${entry.id}`);
  };

  if (categoriesQuery.isLoading) {
    return <LoadingState message={t('search.loadingCategories')} />;
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        description={t('search.categoriesErrorDescription')}
        onRetry={() => categoriesQuery.refetch()}
      />
    );
  }

  const totalPages = results ? (results.totalElements === 0 ? 0 : Math.ceil(results.totalElements / results.size)) : 0;
  const isFirstPage = !results || results.number === 0;
  const isLastPage = !results || totalPages === 0 || results.number >= totalPages - 1;
  const pageStart = results && results.totalElements > 0 ? results.number * results.size + 1 : 0;
  const pageEnd = results && results.totalElements > 0 ? results.number * results.size + results.content.length : 0;

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0) {
      return;
    }
    if (totalPages !== 0 && nextPage > totalPages - 1) {
      return;
    }
    submitWithPage(nextPage);
  };

  const paginationFooter = results && results.content.length
    ? (
        <div className="pagination">
          <span className="pagination__status">
            {t('search.pagination.status', {
              start: pageStart,
              end: pageEnd,
              total: results.totalElements
            })}
          </span>
          <div className="pagination__controls">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => handlePageChange(results.number - 1)}
              disabled={isFirstPage || searchMutation.isPending}
            >
              {t('search.pagination.previous')}
            </button>
            <span className="pagination__page">
              {t('search.pagination.page', {
                current: results.number + 1,
                total: totalPages || 1
              })}
            </span>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => handlePageChange(results.number + 1)}
              disabled={isLastPage || searchMutation.isPending}
            >
              {t('search.pagination.next')}
            </button>
          </div>
        </div>
      )
    : undefined;

  return (
    <div className="page-search">
      <section className="card">
        <header style={{ marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>{t('search.title')}</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>{t('search.subtitle')}</p>
        </header>

        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-grid form-grid--two">
            <div className="input-group">
              <label htmlFor="cpf">{t('search.cpfLabel')}</label>
              <input
                id="cpf"
                className="text-input"
                inputMode="numeric"
                placeholder={t('search.cpfPlaceholder')}
                {...cpfRegister}
              />
            </div>

            <div className="input-group">
              <label htmlFor="categories">{t('search.categoriesLabel')}</label>
              <select
                id="categories"
                className="select-input"
                multiple
                size={Math.min(8, Math.max(categories.length, 3))}
                {...register('categories', { required: true })}
              >
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {t('search.categoriesHint')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="button button--primary" type="submit" disabled={isSubmitting || searchMutation.isPending}>
              {searchMutation.isPending ? t('search.submitting') : t('search.submit')}
            </button>
          </div>
        </form>
      </section>

      {searchMutation.isError ? (
        <ErrorState
          title={t('search.errorTitle')}
          description={t('search.errorDescription')}
          onRetry={() => onSubmit()}
        />
      ) : null}

      {searchMutation.isPending ? <LoadingState message={t('search.loadingResults')} /> : null}

      {results ? (
        <DocumentTable
          items={results.content}
          onSelect={handleDocumentSelect}
          footer={paginationFooter}
        />
      ) : null}
    </div>
  );
}
