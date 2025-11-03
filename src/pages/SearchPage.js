import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { setTransactionId } from '@/api/client';
import { useCategories } from '@/hooks/useCategories';
import { useSearchByCpf } from '@/hooks/useSearchByCpf';
import { DocumentTable } from '@/components/DocumentTable';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { env } from '@/utils/env';
import { formatCpf, unmaskCpf } from '@/utils/format';
const PAGE_SIZE = 10;
const DEFAULT_VERSION_TYPE = 'ALL';
export function SearchPage() {
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const { t } = useTranslation();
    const { register, handleSubmit, watch, setValue, getValues, formState: { isSubmitting } } = useForm({
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
    }, []);
    const submitWithPage = (pageNumber, formValues) => {
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
    const categories = useMemo(() => {
        if (categoriesQuery.data) {
            console.debug('[SearchPage] categories result', categoriesQuery.data);
        }
        return categoriesQuery.data ?? [];
    }, [categoriesQuery.data]);
    const selectedCategories = watch('categories');
    useEffect(() => {
        if (categories.length && !selectedCategories?.length) {
            setValue('categories', categories.map((category) => category.name));
        }
    }, [categories, selectedCategories?.length, setValue]);
    const handleDocumentSelect = (entry) => {
        if (!entry.id)
            return;
        navigate(`/documents/${entry.id}`);
    };
    if (categoriesQuery.isLoading) {
        return _jsx(LoadingState, { message: t('search.loadingCategories') });
    }
    if (categoriesQuery.isError) {
        return (_jsx(ErrorState, { description: t('search.categoriesErrorDescription'), onRetry: () => categoriesQuery.refetch() }));
    }
    const totalPages = results ? (results.totalElements === 0 ? 0 : Math.ceil(results.totalElements / results.size)) : 0;
    const isFirstPage = !results || results.number === 0;
    const isLastPage = !results || totalPages === 0 || results.number >= totalPages - 1;
    const pageStart = results && results.totalElements > 0 ? results.number * results.size + 1 : 0;
    const pageEnd = results && results.totalElements > 0 ? results.number * results.size + results.content.length : 0;
    const handlePageChange = (nextPage) => {
        if (nextPage < 0) {
            return;
        }
        if (totalPages !== 0 && nextPage > totalPages - 1) {
            return;
        }
        submitWithPage(nextPage);
    };
    const paginationFooter = results && results.content.length
        ? (_jsxs("div", { className: "pagination", children: [_jsx("span", { className: "pagination__status", children: t('search.pagination.status', {
                        start: pageStart,
                        end: pageEnd,
                        total: results.totalElements
                    }) }), _jsxs("div", { className: "pagination__controls", children: [_jsx("button", { type: "button", className: "button button--ghost", onClick: () => handlePageChange(results.number - 1), disabled: isFirstPage || searchMutation.isPending, children: t('search.pagination.previous') }), _jsx("span", { className: "pagination__page", children: t('search.pagination.page', {
                                current: results.number + 1,
                                total: totalPages || 1
                            }) }), _jsx("button", { type: "button", className: "button button--ghost", onClick: () => handlePageChange(results.number + 1), disabled: isLastPage || searchMutation.isPending, children: t('search.pagination.next') })] })] }))
        : undefined;
    return (_jsxs("div", { className: "page-search", children: [_jsxs("section", { className: "card", children: [_jsxs("header", { style: { marginBottom: '1rem' }, children: [_jsx("h1", { style: { margin: 0 }, children: t('search.title') }), _jsx("p", { style: { margin: '0.5rem 0 0', color: '#475569' }, children: t('search.subtitle') })] }), _jsxs("form", { onSubmit: onSubmit, className: "form-grid", children: [_jsxs("div", { className: "form-grid form-grid--two", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "cpf", children: t('search.cpfLabel') }), _jsx("input", { id: "cpf", className: "text-input", inputMode: "numeric", placeholder: t('search.cpfPlaceholder'), ...cpfRegister })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "categories", children: t('search.categoriesLabel') }), _jsx("select", { id: "categories", className: "select-input", multiple: true, size: Math.min(8, Math.max(categories.length, 3)), ...register('categories', { required: true }), children: categories.map((category) => (_jsx("option", { value: category.name, children: category.name }, category.name))) }), _jsx("span", { style: { fontSize: '0.8rem', color: '#64748b' }, children: t('search.categoriesHint') })] })] }), _jsx("div", { style: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }, children: _jsx("button", { className: "button button--primary", type: "submit", disabled: isSubmitting || searchMutation.isPending, children: searchMutation.isPending ? t('search.submitting') : t('search.submit') }) })] })] }), searchMutation.isError ? (_jsx(ErrorState, { title: t('search.errorTitle'), description: t('search.errorDescription'), onRetry: () => onSubmit() })) : null, searchMutation.isPending ? _jsx(LoadingState, { message: t('search.loadingResults') }) : null, results ? (_jsx(DocumentTable, { items: results.content, onSelect: handleDocumentSelect, footer: paginationFooter })) : null] }));
}
