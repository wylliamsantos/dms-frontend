import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import axios from 'axios';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCategories } from '@/hooks/useCategories';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import { formatCpf, unmaskCpf } from '@/utils/format';
const parseAttributes = (value) => value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
const extractSchemaRequiredEntries = (schema, categoryName, translate) => {
    const t = translate ?? ((key) => key);
    if (!schema || typeof schema !== 'object') {
        return [];
    }
    const required = Array.isArray(schema.required)
        ? schema.required.filter((item) => typeof item === 'string')
        : [];
    const properties = schema && typeof schema.properties === 'object'
        ? schema.properties
        : {};
    return required.map((field) => {
        const property = properties?.[field];
        const title = typeof property?.title === 'string' ? property.title : undefined;
        const description = typeof property?.description === 'string' ? property.description : undefined;
        const hintParts = [title, description].filter(Boolean);
        const baseHint = categoryName
            ? t('upload.metadata.schemaHint', { category: categoryName })
            : t('upload.metadata.schemaHintFallback');
        return {
            key: field,
            value: '',
            required: true,
            hint: hintParts.length ? `${baseHint} · ${hintParts.join(' · ')}` : baseHint
        };
    });
};
const buildRequiredMetadataEntries = (category, translate) => {
    const t = translate ?? ((key) => key);
    const entries = new Map();
    const categoryAttributes = parseAttributes(category.uniqueAttributes);
    categoryAttributes.forEach((attr) => {
        const key = attr.toLowerCase();
        if (!entries.has(key)) {
            const requiredHint = category.name
                ? t('upload.metadata.requiredHint', { category: category.name })
                : t('upload.metadata.requiredHintFallback');
            entries.set(key, {
                key: attr,
                value: '',
                required: true,
                hint: requiredHint
            });
        }
    });
    const schemaRequiredEntries = extractSchemaRequiredEntries(category.schema, category.name, t);
    schemaRequiredEntries.forEach((entry) => {
        const key = entry.key.toLowerCase();
        if (entries.has(key)) {
            const existing = entries.get(key);
            entries.set(key, {
                ...existing,
                hint: existing.hint ? `${existing.hint} · ${entry.hint}` : entry.hint
            });
        }
        else {
            entries.set(key, entry);
        }
    });
    return Array.from(entries.values());
};
const normalizeMetadataKey = (value) => value?.trim().toLowerCase() ?? '';
export function DocumentUploadPage() {
    const navigate = useNavigate();
    const categoriesQuery = useCategories();
    const uploadMutation = useUploadDocument();
    const uploadProgress = typeof uploadMutation.progress === 'number' ? uploadMutation.progress : 0;
    const { t, i18n } = useTranslation();
    const { register, control, handleSubmit, setValue, watch, reset, formState: { isSubmitting, errors } } = useForm({
        defaultValues: {
            category: '',
            issuingDate: '',
            author: '',
            comment: '',
            filename: '',
            isFinal: false,
            cpf: '',
            metadata: [{ key: '', value: '', required: false }],
            document: undefined
        }
    });
    const metadataFieldArray = useFieldArray({
        control,
        name: 'metadata'
    });
    const metadataFields = metadataFieldArray.fields.map((field, index) => ({ field, index }));
    const requiredMetadata = metadataFields.filter((item) => item.field.required);
    const optionalMetadata = metadataFields.filter((item) => !item.field.required);
    const documentFiles = watch('document');
    const categoryValue = watch('category');
    const metadataValues = watch('metadata');
    const categories = useMemo(() => {
        const items = categoriesQuery.data ?? [];
        return items.filter((category) => category.active !== false);
    }, [categoriesQuery.data]);
    useEffect(() => {
        const file = documentFiles?.[0];
        if (file) {
            setValue('filename', file.name, { shouldDirty: false });
        }
        else {
            setValue('filename', '', { shouldDirty: false });
        }
    }, [documentFiles, setValue]);
    useEffect(() => {
        if (categories.length && !categoryValue) {
            setValue('category', categories[0].name, { shouldDirty: false });
        }
    }, [categories, categoryValue, setValue]);
    useEffect(() => {
        if (!categories.length || !categoryValue) {
            return;
        }
        const category = categories.find((item) => item.name === categoryValue);
        if (!category) {
            return;
        }
        const requiredEntries = buildRequiredMetadataEntries(category, t);
        if (!requiredEntries.length) {
            return;
        }
        const currentMetadata = metadataValues ?? [];
        const requiredKeys = new Set(requiredEntries.map((entry) => normalizeMetadataKey(entry.key)));
        requiredEntries.forEach((entry) => {
            const existingIndex = currentMetadata.findIndex((field) => normalizeMetadataKey(field?.key) === normalizeMetadataKey(entry.key));
            if (existingIndex >= 0) {
                const currentField = currentMetadata[existingIndex];
                if (!currentField) {
                    return;
                }
                if (!currentField.required || currentField.hint !== entry.hint || currentField.key !== entry.key) {
                    metadataFieldArray.update(existingIndex, {
                        ...currentField,
                        key: entry.key,
                        required: true,
                        hint: entry.hint
                    });
                }
            }
            else {
                metadataFieldArray.append(entry, { shouldFocus: false });
            }
        });
        currentMetadata.forEach((field, index) => {
            const normalized = normalizeMetadataKey(field?.key);
            if (!field) {
                return;
            }
            if (field.required && !requiredKeys.has(normalized)) {
                metadataFieldArray.update(index, {
                    ...field,
                    required: false,
                    hint: undefined
                });
            }
        });
    }, [categories, categoryValue, metadataValues, metadataFieldArray, t, i18n.language]);
    const cpfRegister = register('cpf', {
        required: t('upload.validation.cpfRequired'),
        onChange: (event) => {
            const formatted = formatCpf(event.target.value);
            if (formatted !== event.target.value) {
                setValue('cpf', formatted, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            }
        }
    });
    const uploadErrorMessage = useMemo(() => {
        if (!uploadMutation.error) {
            return null;
        }
        const error = uploadMutation.error;
        if (axios.isAxiosError(error)) {
            const data = error.response?.data;
            if (data && typeof data === 'object') {
                if ('mensagem' in data && typeof data.mensagem === 'string') {
                    return data.mensagem;
                }
                if ('message' in data && typeof data.message === 'string') {
                    return data.message;
                }
            }
        }
        if (error instanceof Error) {
            return error.message;
        }
        return null;
    }, [uploadMutation.error]);
    const defaultUploadErrorDescription = t('errors.uploadDescription');
    const errorDescription = uploadErrorMessage
        ? `${defaultUploadErrorDescription} ${uploadErrorMessage}`
        : defaultUploadErrorDescription;
    const onSubmit = handleSubmit((values) => {
        const file = values.document?.[0];
        if (!file) {
            return;
        }
        const metadataPayload = buildMetadataPayload(values);
        const filename = values.filename || file.name;
        uploadMutation.mutate({
            file,
            category: values.category,
            metadata: metadataPayload,
            isFinal: values.isFinal,
            issuingDate: values.issuingDate || undefined,
            author: values.author?.trim(),
            comment: values.comment?.trim() || undefined,
            filename
        }, {
            onSuccess: () => {
                reset({
                    category: values.category,
                    issuingDate: '',
                    author: '',
                    comment: '',
                    filename: '',
                    isFinal: false,
                    cpf: '',
                    metadata: [{ key: '', value: '', required: false }],
                    document: undefined
                });
            }
        });
    });
    const buildMetadataPayload = (values) => {
        const metadata = {};
        const cpfValue = unmaskCpf(values.cpf);
        if (cpfValue) {
            metadata.cpf = cpfValue;
        }
        values.metadata
            .filter((entry) => entry.key && entry.key.trim() && entry.value.trim())
            .forEach((entry) => {
            metadata[entry.key.trim()] = entry.value.trim();
        });
        if (!Object.keys(metadata).length) {
            return '{}';
        }
        return JSON.stringify(metadata);
    };
    const handleNavigateToDocument = (documentId) => {
        if (!documentId?.id)
            return;
        navigate(`/documents/${documentId.id}`);
    };
    if (categoriesQuery.isLoading) {
        return _jsx(LoadingState, { message: t('search.loadingCategories') });
    }
    if (categoriesQuery.isError) {
        return (_jsx(ErrorState, { title: t('upload.categoriesErrorTitle'), description: t('upload.categoriesErrorDescription'), onRetry: () => categoriesQuery.refetch() }));
    }
    return (_jsxs("div", { className: "page-upload", children: [_jsxs("section", { className: "card", style: { marginBottom: '1rem' }, children: [_jsxs("header", { style: { marginBottom: '1rem' }, children: [_jsx("h1", { style: { margin: 0 }, children: t('upload.title') }), _jsx("p", { style: { margin: '0.5rem 0 0', color: '#475569' }, children: t('upload.subtitle') })] }), _jsxs("form", { onSubmit: onSubmit, className: "form-grid", children: [_jsxs("div", { className: "form-grid form-grid--two", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "document", children: t('upload.fields.file') }), _jsx("input", { id: "document", type: "file", className: "text-input", accept: "*/*", ...register('document', { required: t('upload.validation.documentRequired') }) }), errors.document ? _jsx("span", { className: "input-error", children: errors.document.message }) : null] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "filename", children: t('upload.fields.fileName') }), _jsx("input", { id: "filename", className: "text-input", placeholder: t('upload.fields.fileNamePlaceholder'), ...register('filename', { required: t('upload.validation.fileNameRequired') }) }), _jsx("span", { className: "input-hint", children: t('upload.fields.fileNameHint') }), errors.filename ? _jsx("span", { className: "input-error", children: errors.filename.message }) : null] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "category", children: t('upload.fields.category') }), _jsx("select", { id: "category", className: "select-input", ...register('category', { required: t('upload.validation.categoryRequired') }), children: categories.map((category) => (_jsx("option", { value: category.name, children: category.name }, category.name))) }), errors.category ? _jsx("span", { className: "input-error", children: errors.category.message }) : null] }), _jsxs("div", { className: "form-grid form-grid--two", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "issuingDate", children: t('upload.fields.issuingDate') }), _jsx("input", { id: "issuingDate", type: "date", className: "text-input", ...register('issuingDate') })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "author", children: t('upload.fields.author') }), _jsx("input", { id: "author", className: "text-input", placeholder: t('upload.fields.authorPlaceholder'), ...register('author', {
                                                    required: t('upload.validation.authorRequired'),
                                                    setValueAs: (value) => value?.trim() ?? ''
                                                }) }), errors.author ? _jsx("span", { className: "input-error", children: errors.author.message }) : null] })] }), _jsxs("div", { className: "form-grid form-grid--two", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "cpf", children: t('upload.fields.cpf') }), _jsx("input", { id: "cpf", className: "text-input", inputMode: "numeric", placeholder: t('search.cpfPlaceholder'), ...cpfRegister }), errors.cpf ? _jsx("span", { className: "input-error", children: errors.cpf.message }) : null] }), _jsxs("div", { className: "input-group input-group--inline", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("input", { id: "isFinal", type: "checkbox", ...register('isFinal') }), _jsx("label", { htmlFor: "isFinal", style: { margin: 0 }, children: t('upload.fields.finalLabel') })] }), _jsx("span", { className: "input-hint", children: t('upload.fields.finalHint') })] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { htmlFor: "comment", children: t('upload.fields.comment') }), _jsx("textarea", { id: "comment", rows: 4, className: "text-input", style: { resize: 'vertical' }, placeholder: t('upload.fields.commentPlaceholder'), ...register('comment') })] }), _jsxs("div", { children: [_jsx("h2", { style: { margin: '1.5rem 0 0.75rem' }, children: t('upload.metadata.sectionTitle') }), _jsx("p", { style: { margin: '0 0 1rem', color: '#475569' }, children: t('upload.metadata.description') }), _jsxs("div", { className: "metadata-extra", children: [requiredMetadata.length ? (_jsxs("div", { className: "metadata-section", children: [_jsx("h3", { className: "metadata-section__title", children: t('upload.metadata.requiredTitle') }), requiredMetadata.map(({ field, index }) => {
                                                        const keyError = errors.metadata?.[index]?.key?.message;
                                                        const valueError = errors.metadata?.[index]?.value?.message;
                                                        return (_jsxs("div", { className: "metadata-extra__row", children: [_jsxs("div", { className: "metadata-extra__inputs", children: [_jsx("input", { className: "text-input", placeholder: t('upload.metadata.keyPlaceholder'), defaultValue: field.key, readOnly: true, ...register(`metadata.${index}.key`, {
                                                                                required: t('upload.validation.requiredField')
                                                                            }) }), _jsx("input", { className: "text-input", placeholder: t('upload.metadata.valuePlaceholder'), defaultValue: field.value, ...register(`metadata.${index}.value`, {
                                                                                required: t('upload.validation.requiredField')
                                                                            }) })] }), _jsxs("div", { className: "metadata-extra__actions", children: [field.hint ? _jsx("span", { className: "metadata-extra__hint", children: field.hint }) : null, valueError ? _jsx("span", { className: "input-error", children: valueError }) : null] })] }, field.id));
                                                    })] })) : null, _jsx("div", { className: "metadata-divider" }), _jsxs("div", { className: "metadata-section", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }, children: [_jsx("h3", { className: "metadata-section__title", style: { margin: 0 }, children: t('upload.metadata.optionalTitle') }), _jsx("button", { type: "button", className: "button", onClick: () => metadataFieldArray.append({ key: '', value: '', required: false }), children: t('upload.metadata.addButton') })] }), optionalMetadata.length ? (optionalMetadata.map(({ field, index }) => {
                                                        const keyError = errors.metadata?.[index]?.key?.message;
                                                        const valueError = errors.metadata?.[index]?.value?.message;
                                                        return (_jsxs("div", { className: "metadata-extra__row", children: [_jsxs("div", { className: "metadata-extra__inputs", children: [_jsx("input", { className: "text-input", placeholder: t('upload.metadata.keyPlaceholder'), defaultValue: field.key, ...register(`metadata.${index}.key`) }), _jsx("input", { className: "text-input", placeholder: t('upload.metadata.valuePlaceholder'), defaultValue: field.value, ...register(`metadata.${index}.value`) })] }), _jsxs("div", { className: "metadata-extra__actions", children: [keyError ? _jsx("span", { className: "input-error", children: keyError }) : null, valueError ? _jsx("span", { className: "input-error", children: valueError }) : null, metadataFieldArray.fields.length > 1 ? (_jsx("button", { type: "button", className: "button", onClick: () => metadataFieldArray.remove(index), children: t('upload.metadata.removeButton') })) : null] })] }, field.id));
                                                    })) : (_jsx("p", { className: "metadata-empty", children: t('upload.metadata.optionalEmpty') }))] })] })] }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }, children: _jsx("button", { className: "button button--primary", type: "submit", disabled: isSubmitting ||
                                        uploadMutation.isPending ||
                                        uploadMutation.isUploadingToStorage, children: uploadMutation.isPending ? t('upload.buttons.submitting') : t('upload.buttons.submit') }) })] })] }), (uploadMutation.isUploadingToStorage || (uploadMutation.isSuccess && uploadMutation.data)) && (_jsx("div", { className: "modal-overlay", role: "alert", "aria-live": "assertive", children: _jsxs("div", { className: "modal", children: [uploadMutation.isUploadingToStorage ? (_jsxs(_Fragment, { children: [_jsx("h2", { className: "modal__title", children: t('upload.progress.title') }), _jsx("p", { className: "modal__description", children: t('upload.progress.description') }), _jsx("div", { className: "upload-progress__bar", children: _jsx("div", { className: "upload-progress__bar-fill", style: { width: `${Math.min(Math.max(uploadProgress, 0), 100)}%` } }) }), _jsx("span", { className: "upload-progress__percent", children: t('upload.progress.percent', { value: uploadProgress }) })] })) : null, !uploadMutation.isUploadingToStorage && uploadMutation.isSuccess && uploadMutation.data ? (_jsxs(_Fragment, { children: [_jsx("h2", { className: "modal__title", children: t('upload.success.title') }), _jsx("p", { className: "modal__description", children: t('upload.success.description') }), _jsxs("dl", { className: "modal__details", children: [_jsxs("div", { children: [_jsx("dt", { children: t('upload.success.identifier') }), _jsx("dd", { children: uploadMutation.data.id })] }), _jsxs("div", { children: [_jsx("dt", { children: t('upload.success.version') }), _jsx("dd", { children: uploadMutation.data.version })] })] }), _jsxs("div", { className: "modal__actions", children: [_jsx("button", { className: "button button--primary", type: "button", onClick: () => handleNavigateToDocument(uploadMutation.data), children: t('upload.success.viewDetails') }), _jsx("button", { className: "button", type: "button", onClick: () => {
                                                uploadMutation.reset();
                                                reset({
                                                    category: categories[0]?.name ?? '',
                                                    issuingDate: '',
                                                    author: '',
                                                    comment: '',
                                                    filename: '',
                                                    isFinal: false,
                                                    cpf: '',
                                                    metadata: [{ key: '', value: '', required: false }],
                                                    document: undefined
                                                });
                                            }, children: t('upload.success.newUpload') })] })] })) : null] }) })), uploadMutation.isError ? (_jsx(ErrorState, { title: t('errors.uploadTitle'), description: errorDescription, onRetry: () => uploadMutation.reset() })) : null] }));
}
