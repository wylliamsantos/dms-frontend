import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';

import { setTransactionId } from '@/api/client';
import { useCategories } from '@/hooks/useCategories';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchByBusinessKey } from '@/hooks/useSearchByBusinessKey';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { DocumentTable } from '@/components/DocumentTable';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { env } from '@/utils/env';
import { PageResponse, SearchEntry } from '@/types/document';

const PAGE_SIZE = 10;
const DEFAULT_VERSION_TYPE = 'ALL' as const;

interface FiltersForm {
  businessKeyValue: string;
  textQuery: string;
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
      businessKeyValue: '',
      textQuery: '',
      categories: []
    }
  });

  const categoriesQuery = useCategories();
  const searchMutation = useSearchByBusinessKey();

  useEffect(() => {
    setTransactionId(env.defaultTransactionId);
  }, []);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const selectedCategories = watch('categories');
  const textQuery = watch('textQuery');
  const debouncedTextQuery = useDebouncedValue(textQuery ?? '', 350);
  const [showSuggestionsLoading, setShowSuggestionsLoading] = useState(false);
  const [displayedSuggestionOptions, setDisplayedSuggestionOptions] = useState<string[]>([]);
  const [lastSuggestionsUpdateAt, setLastSuggestionsUpdateAt] = useState<number | null>(null);
  const [lastResolvedSuggestionQuery, setLastResolvedSuggestionQuery] = useState('');
  const suggestionsLoadingShownAtRef = useRef<number | null>(null);

  const suggestionsQuery = useSearchSuggestions({
    query: debouncedTextQuery,
    categories: selectedCategories ?? [],
    limit: 8
  });

  const normalizedSuggestionQuery = debouncedTextQuery.trim().toLowerCase();
  const normalizedLiveSuggestionQuery = textQuery.trim().toLowerCase();
  const suggestionOptions = useMemo(() => {
    if (normalizedLiveSuggestionQuery.length < 2) {
      return [];
    }

    const unique = new Set<string>();
    for (const suggestion of suggestionsQuery.data ?? []) {
      const normalized = suggestion.trim();
      if (!normalized) continue;
      if (!normalized.toLowerCase().includes(normalizedLiveSuggestionQuery)) continue;
      unique.add(normalized);
      if (unique.size >= 8) break;
    }
    return Array.from(unique);
  }, [suggestionsQuery.data, normalizedLiveSuggestionQuery]);

  const isDebouncingSuggestions = normalizedLiveSuggestionQuery.length >= 2 && normalizedLiveSuggestionQuery !== normalizedSuggestionQuery;
  const isSuggestionsRefreshing = normalizedSuggestionQuery.length >= 2 && suggestionsQuery.isFetching && displayedSuggestionOptions.length > 0;
  const isSuggestionResultSettled = normalizedSuggestionQuery.length >= 2
    && !suggestionsQuery.isFetching
    && !suggestionsQuery.isError
    && lastResolvedSuggestionQuery === normalizedSuggestionQuery;
  const suggestionsFreshnessLabel = useMemo(() => {
    if (!lastSuggestionsUpdateAt) return null;
    const seconds = Math.max(0, Math.round((Date.now() - lastSuggestionsUpdateAt) / 1000));
    if (seconds <= 4) return 'Sugestões atualizadas agora mesmo.';
    if (seconds < 60) return `Sugestões atualizadas há ${seconds}s.`;
    const minutes = Math.round(seconds / 60);
    return `Sugestões atualizadas há ${minutes}min.`;
  }, [lastSuggestionsUpdateAt, suggestionsQuery.data]);

  useEffect(() => {
    if (categories.length && !selectedCategories?.length) {
      setValue('categories', categories.map((category) => category.name));
    }
  }, [categories, selectedCategories?.length, setValue]);

  useEffect(() => {
    if (normalizedLiveSuggestionQuery.length < 2) {
      setDisplayedSuggestionOptions([]);
      return;
    }

    if (suggestionsQuery.isError && displayedSuggestionOptions.length > 0) {
      return;
    }

    if (suggestionOptions.length > 0 || (!suggestionsQuery.isFetching && !suggestionsQuery.isError)) {
      setDisplayedSuggestionOptions(suggestionOptions);
      setLastSuggestionsUpdateAt(Date.now());
      if (!suggestionsQuery.isFetching && !suggestionsQuery.isError) {
        setLastResolvedSuggestionQuery(normalizedSuggestionQuery);
      }
    }
  }, [normalizedLiveSuggestionQuery.length, normalizedSuggestionQuery, suggestionOptions, suggestionsQuery.isFetching, suggestionsQuery.isError, displayedSuggestionOptions.length]);

  useEffect(() => {
    const hasQuery = debouncedTextQuery.trim().length >= 2;
    const hasPreviousSuggestions = Boolean(displayedSuggestionOptions.length);

    if (!hasQuery || !suggestionsQuery.isFetching || hasPreviousSuggestions) {
      if (!showSuggestionsLoading) {
        return;
      }
      const shownAt = suggestionsLoadingShownAtRef.current;
      const elapsed = shownAt ? Date.now() - shownAt : 0;
      const remaining = Math.max(0, 220 - elapsed);
      const hideTimer = window.setTimeout(() => {
        setShowSuggestionsLoading(false);
        suggestionsLoadingShownAtRef.current = null;
      }, remaining);
      return () => window.clearTimeout(hideTimer);
    }

    const timeout = window.setTimeout(() => {
      suggestionsLoadingShownAtRef.current = Date.now();
      setShowSuggestionsLoading(true);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [debouncedTextQuery, suggestionsQuery.isFetching, displayedSuggestionOptions.length, showSuggestionsLoading]);

  const selectedCategoryDetails = useMemo(
    () => categories.filter((category) => (selectedCategories ?? []).includes(category.name)),
    [categories, selectedCategories]
  );

  const selectedBusinessKeyTypes = useMemo(() => {
    const keys = new Set(
      selectedCategoryDetails
        .map((category) => category.businessKeyField?.trim().toLowerCase())
        .filter((value): value is string => !!value)
    );
    return Array.from(keys);
  }, [selectedCategoryDetails]);

  const hasIncompatibleCategories = selectedBusinessKeyTypes.length > 1;
  const businessKeyType = selectedBusinessKeyTypes[0] ?? 'cpf';
  const businessKeyLabel = businessKeyType.toUpperCase();

  const submitWithPage = (pageNumber: number, formValues?: FiltersForm) => {
    const values = formValues ?? getValues();
    if (hasIncompatibleCategories) {
      return;
    }

    const payload = {
      businessKeyType,
      businessKeyValue: values.businessKeyValue.trim(),
      textQuery: values.textQuery.trim() || undefined,
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
    if (nextPage < 0) return;
    if (totalPages !== 0 && nextPage > totalPages - 1) return;
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
              <label htmlFor="businessKeyValue">{businessKeyLabel}</label>
              <input
                id="businessKeyValue"
                className="text-input"
                inputMode="text"
                placeholder={`Informe ${businessKeyLabel}`}
                {...register('businessKeyValue', { required: true })}
              />
            </div>

            <div className="input-group">
              <label htmlFor="textQuery">Texto (nome/metadados)</label>
              <input
                id="textQuery"
                className="text-input"
                inputMode="text"
                placeholder="Ex: contrato, banco, vencimento"
                list="search-text-suggestions"
                {...register('textQuery')}
              />
              <datalist id="search-text-suggestions">
                {displayedSuggestionOptions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
              {showSuggestionsLoading ? (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Carregando sugestões...</span>
              ) : null}
              {!showSuggestionsLoading && isDebouncingSuggestions ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Aguardando pausa na digitação…</span>
              ) : null}
              {!showSuggestionsLoading && !isDebouncingSuggestions && isSuggestionsRefreshing ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Atualizando sugestões…</span>
              ) : null}
              {!showSuggestionsLoading && !isDebouncingSuggestions && !isSuggestionsRefreshing && textQuery.trim().length > 0 && textQuery.trim().length < 2 ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Digite ao menos 2 caracteres para sugerir termos.</span>
              ) : null}
              {!showSuggestionsLoading && suggestionsQuery.isError && displayedSuggestionOptions.length > 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#b45309' }}>Não foi possível atualizar sugestões agora. Mantendo últimas opções.</span>
              ) : null}
              {!showSuggestionsLoading && !isDebouncingSuggestions && !isSuggestionsRefreshing && normalizedLiveSuggestionQuery.length >= 2 && isSuggestionResultSettled && displayedSuggestionOptions.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sem sugestões para o termo atual.</span>
              ) : null}
              {!showSuggestionsLoading && !isDebouncingSuggestions && !isSuggestionsRefreshing && normalizedLiveSuggestionQuery.length >= 2 && suggestionsFreshnessLabel ? (
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{suggestionsFreshnessLabel}</span>
              ) : null}
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

          {hasIncompatibleCategories ? (
            <div className="input-error">
              As categorias selecionadas usam chaves diferentes ({selectedBusinessKeyTypes.join(', ')}). Selecione apenas categorias com a mesma business key para consultar.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="button button--primary"
              type="submit"
              disabled={isSubmitting || searchMutation.isPending || hasIncompatibleCategories}
            >
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
