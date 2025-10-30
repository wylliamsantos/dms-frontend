import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import axios from 'axios';
import { useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import { CategoryForm } from '@/components/category/CategoryForm';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCategories } from '@/hooks/useCategories';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategoryMutations';
const defaultSchema = {};
const isCategoryActive = (category) => {
    if (!category) {
        return true;
    }
    return category.active !== false;
};
const buildPayloadFromCategory = (category, overrides) => ({
    name: category.name ?? '',
    title: category.title,
    description: category.description,
    documentGroup: category.documentGroup,
    uniqueAttributes: category.uniqueAttributes,
    validityInDays: category.validityInDays,
    schema: category.schema ?? defaultSchema,
    types: category.types ?? [],
    active: overrides?.active ?? category.active ?? true,
    ...overrides
});
const extractErrorMessage = (error, fallback) => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
            return data.message;
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
    const [formMode, setFormMode] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [feedback, setFeedback] = useState(null);
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
    const handleEditClick = (category) => {
        setFeedback(null);
        setSelectedCategory(category);
        setFormMode('edit');
    };
    const handleDuplicateClick = (category) => {
        setFeedback(null);
        setSelectedCategory(category);
        setFormMode('duplicate');
    };
    const handleToggleActive = (category) => {
        if (!category.id) {
            return;
        }
        setFeedback(null);
        const currentActive = isCategoryActive(category);
        const payload = buildPayloadFromCategory(category, { active: !currentActive });
        updateMutation.mutate({ id: category.id, payload }, {
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
        });
    };
    const handleSubmit = (payload) => {
        if (formMode === 'edit' && selectedCategory?.id) {
            updateMutation.mutate({ id: selectedCategory.id, payload }, {
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
            });
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
    if (categoriesQuery.isLoading) {
        return _jsx(LoadingState, { message: t('search.loadingCategories') });
    }
    if (categoriesQuery.isError) {
        return (_jsx(ErrorState, { title: t('categoriesPage.error.title'), description: t('categoriesPage.error.description'), onRetry: () => categoriesQuery.refetch() }));
    }
    const showForm = formMode !== null;
    return (_jsxs("div", { className: "page-categories", children: [_jsx("section", { className: "card", style: { marginBottom: '1rem' }, children: _jsxs("header", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsx("h1", { style: { margin: 0 }, children: t('categoriesPage.title') }), _jsx("p", { style: { margin: '0.5rem 0 0', color: '#475569' }, children: t('categoriesPage.subtitle') })] }), _jsx("button", { className: "button button--primary", type: "button", onClick: handleCreateClick, disabled: isSubmitting, children: t('categoriesPage.new') })] }) }), feedback ? (_jsx("div", { className: `card ${feedback.type === 'error' ? 'card--error' : 'card--success'}`, style: { marginBottom: '1rem' }, children: _jsx("span", { children: feedback.message }) })) : null, showForm ? (_jsx("section", { className: "card", style: { marginBottom: '1.5rem' }, children: _jsx(CategoryForm, { mode: formMode, initialData: selectedCategory, onSubmit: handleSubmit, onCancel: closeForm, isSubmitting: isSubmitting }) })) : null, _jsxs("section", { className: "card", children: [_jsxs("header", { style: { marginBottom: '1rem' }, children: [_jsx("h2", { style: { margin: 0 }, children: t('categoriesPage.table.title') }), _jsx("p", { style: { margin: '0.5rem 0 0', color: '#64748b' }, children: t('categoriesPage.table.subtitle') })] }), _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('categoriesPage.table.headers.name') }), _jsx("th", { children: t('categoriesPage.table.headers.title') }), _jsx("th", { children: t('categoriesPage.table.headers.group') }), _jsx("th", { children: t('categoriesPage.table.headers.status') }), _jsx("th", { children: t('categoriesPage.table.headers.types') }), _jsx("th", { children: t('categoriesPage.table.headers.actions') })] }) }), _jsxs("tbody", { children: [categories.map((category) => (_jsxs("tr", { children: [_jsx("td", { children: category.name }), _jsx("td", { children: category.title ?? '—' }), _jsx("td", { children: category.documentGroup ?? '—' }), _jsx("td", { children: _jsx("span", { className: `badge ${isCategoryActive(category) ? 'badge--success' : 'badge--muted'}`, children: isCategoryActive(category)
                                                            ? t('categoriesPage.table.status.active')
                                                            : t('categoriesPage.table.status.inactive') }) }), _jsx("td", { children: category.types?.length ?? 0 }), _jsx("td", { children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", className: "link-button", onClick: () => handleEditClick(category), children: t('categoriesPage.table.actions.edit') }), _jsx("button", { type: "button", className: "link-button", onClick: () => handleDuplicateClick(category), children: t('categoriesPage.table.actions.duplicate') }), _jsx("button", { type: "button", className: "link-button", onClick: () => handleToggleActive(category), disabled: isSubmitting, children: isCategoryActive(category)
                                                                    ? t('categoriesPage.table.actions.deactivate')
                                                                    : t('categoriesPage.table.actions.reactivate') })] }) })] }, category.id ?? category.name))), categories.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }, children: t('categoriesPage.table.empty') }) })) : null] })] }) })] })] }));
}
