import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from '@/i18n';
const documentGroups = ['PERSONAL', 'LEGAL', 'CUSTOM'];
const emptyFormValues = {
    name: '',
    title: '',
    description: '',
    documentGroup: '',
    uniqueAttributes: '',
    validityInDays: '',
    schemaText: '{\n  \n}',
    active: true,
    types: []
};
const toSchemaText = (schema) => {
    try {
        if (!schema || Object.keys(schema).length === 0) {
            return '{\n  \n}';
        }
        return JSON.stringify(schema, null, 2);
    }
    catch (error) {
        return '{\n  \n}';
    }
};
const toString = (value) => (typeof value === 'number' ? String(value) : '');
const buildDefaultValues = (category, mode = 'create', copySuffix = '') => {
    if (!category) {
        return emptyFormValues;
    }
    const duplicateSuffix = mode === 'duplicate' ? copySuffix : '';
    return {
        name: (category.name ?? '') + duplicateSuffix,
        title: category.title ?? '',
        description: category.description ?? '',
        documentGroup: category.documentGroup ?? '',
        uniqueAttributes: category.uniqueAttributes ?? '',
        validityInDays: toString(category.validityInDays),
        schemaText: toSchemaText(category.schema),
        active: category.active ?? true,
        types: category.types?.map((type) => ({
            name: type.name ?? '',
            description: type.description ?? '',
            validityInDays: toString(type.validityInDays),
            requiredAttributes: type.requiredAttributes ?? ''
        })) ?? []
    };
};
const sanitizeNumber = (value) => {
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const sanitizeString = (value) => {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
};
export function CategoryForm({ mode, initialData, onSubmit, onCancel, isSubmitting }) {
    const { t, i18n } = useTranslation();
    const defaultValues = useMemo(() => buildDefaultValues(initialData, mode, t('categoryForm.copySuffix')), [initialData, mode, t, i18n.language]);
    const { register, control, handleSubmit, reset, formState: { errors }, setError, clearErrors } = useForm({
        defaultValues
    });
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'types'
    });
    const submitForm = handleSubmit((values) => {
        let schemaObject = {};
        if (values.schemaText && values.schemaText.trim().length) {
            try {
                clearErrors('schemaText');
                schemaObject = JSON.parse(values.schemaText);
            }
            catch (error) {
                setError('schemaText', { type: 'manual', message: t('categoryForm.errors.invalidJson') });
                return;
            }
        }
        const payload = {
            name: values.name.trim(),
            title: sanitizeString(values.title),
            description: sanitizeString(values.description),
            documentGroup: values.documentGroup || undefined,
            uniqueAttributes: sanitizeString(values.uniqueAttributes),
            validityInDays: sanitizeNumber(values.validityInDays),
            schema: schemaObject,
            types: values.types
                .map((type) => ({
                name: type.name.trim(),
                description: sanitizeString(type.description),
                validityInDays: sanitizeNumber(type.validityInDays),
                requiredAttributes: sanitizeString(type.requiredAttributes)
            }))
                .filter((type) => type.name.length > 0),
            active: values.active
        };
        onSubmit(payload);
    });
    return (_jsxs("form", { onSubmit: submitForm, className: "form-grid", children: [_jsxs("header", { children: [_jsxs("h2", { style: { margin: 0 }, children: [mode === 'create' && t('categoryForm.titles.create'), mode === 'edit' && t('categoryForm.titles.edit'), mode === 'duplicate' && t('categoryForm.titles.duplicate')] }), _jsx("p", { style: { margin: '0.5rem 0 0', color: '#64748b' }, children: t('categoryForm.subtitle') })] }), _jsxs("div", { className: "form-grid form-grid--two", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-name", children: t('categoryForm.fields.name') }), _jsx("input", { id: "category-name", className: "text-input", placeholder: t('categoryForm.fields.namePlaceholder'), ...register('name', { required: t('categoryForm.errors.nameRequired') }) }), errors.name ? _jsx("span", { className: "input-error", children: errors.name.message }) : null] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-title", children: t('categoryForm.fields.title') }), _jsx("input", { id: "category-title", className: "text-input", placeholder: t('categoryForm.fields.titlePlaceholder'), ...register('title') })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-group", children: t('categoryForm.fields.group') }), _jsxs("select", { id: "category-group", className: "select-input", ...register('documentGroup'), children: [_jsx("option", { value: "", children: t('categoryForm.fields.groupPlaceholder') }), documentGroups.map((group) => (_jsx("option", { value: group, children: group }, group)))] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-unique-attributes", children: t('categoryForm.fields.uniqueAttributes') }), _jsx("input", { id: "category-unique-attributes", className: "text-input", placeholder: t('categoryForm.fields.uniqueAttributesPlaceholder'), ...register('uniqueAttributes') }), _jsx("span", { className: "input-hint", children: t('categoryForm.fields.uniqueAttributesHint') })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-validity", children: t('categoryForm.fields.validityInDays') }), _jsx("input", { id: "category-validity", className: "text-input", inputMode: "numeric", ...register('validityInDays') })] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-description", children: t('categoryForm.fields.description') }), _jsx("textarea", { id: "category-description", className: "text-input", rows: 3, placeholder: t('categoryForm.fields.descriptionPlaceholder'), ...register('description') })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category-schema", children: t('categoryForm.fields.schema') }), _jsx("textarea", { id: "category-schema", className: "text-input", rows: 6, ...register('schemaText') }), _jsx("span", { className: "input-hint", children: t('categoryForm.fields.schemaHint') }), errors.schemaText ? _jsx("span", { className: "input-error", children: errors.schemaText.message }) : null] }), _jsx("div", { className: "metadata-divider" }), _jsxs("section", { className: "metadata-section", children: [_jsx("h3", { className: "metadata-section__title", children: t('categoryForm.fields.typesTitle') }), _jsx("p", { className: "input-hint", children: t('categoryForm.fields.typesDescription') }), fields.length === 0 ? (_jsx("span", { className: "metadata-empty", children: t('categoryForm.fields.typesEmpty') })) : null, fields.map((field, index) => (_jsxs("div", { className: "metadata-extra__row", children: [_jsxs("div", { className: "metadata-extra__inputs", children: [_jsx("input", { className: "text-input", placeholder: t('categoryForm.fields.typeNamePlaceholder'), ...register(`types.${index}.name`, { required: false }) }), _jsx("input", { className: "text-input", placeholder: t('categoryForm.fields.typeDescriptionPlaceholder'), ...register(`types.${index}.description`) }), _jsx("input", { className: "text-input", placeholder: t('categoryForm.fields.typeValidityPlaceholder'), inputMode: "numeric", ...register(`types.${index}.validityInDays`) }), _jsx("input", { className: "text-input", placeholder: t('categoryForm.fields.typeAttributesPlaceholder'), ...register(`types.${index}.requiredAttributes`) })] }), _jsx("div", { className: "metadata-extra__actions", children: _jsx("button", { type: "button", className: "link-button", onClick: () => remove(index), children: t('categoryForm.buttons.removeType') }) })] }, field.id))), _jsx("button", { type: "button", className: "button button--ghost", onClick: () => append({ name: '', description: '', validityInDays: '', requiredAttributes: '' }), children: t('categoryForm.buttons.addType') })] }), _jsx("div", { className: "metadata-divider" }), _jsxs("div", { className: "input-group input-group--inline", children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx("input", { type: "checkbox", ...register('active') }), " ", t('categoryForm.fields.activeLabel')] }), _jsx("span", { className: "input-hint", children: t('categoryForm.fields.activeHint') })] }), _jsxs("div", { style: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }, children: [_jsx("button", { type: "button", className: "button", onClick: onCancel, disabled: isSubmitting, children: t('categoryForm.buttons.cancel') }), _jsx("button", { className: "button button--primary", type: "submit", disabled: isSubmitting, children: isSubmitting ? t('categoryForm.buttons.saving') : t('categoryForm.buttons.save') })] })] }));
}
