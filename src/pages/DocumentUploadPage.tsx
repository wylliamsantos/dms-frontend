import axios from 'axios';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCategories } from '@/hooks/useCategories';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import { DocumentCategory, DocumentId } from '@/types/document';
import { formatCpf, unmaskCpf } from '@/utils/format';

interface MetadataEntryForm {
  key: string;
  value: string;
  required?: boolean;
  hint?: string;
}

const parseAttributes = (value?: string) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const extractSchemaRequiredEntries = (
  schema: Record<string, unknown> | undefined,
  categoryName: string | undefined,
  translate?: (key: string, options?: Record<string, unknown>) => string
): MetadataEntryForm[] => {
  const t = translate ?? ((key: string) => key);
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const required = Array.isArray((schema as Record<string, unknown>).required)
    ? ((schema as Record<string, unknown>).required as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];

  const properties =
    schema && typeof (schema as Record<string, unknown>).properties === 'object'
      ? ((schema as Record<string, unknown>).properties as Record<string, Record<string, unknown>>)
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

const buildRequiredMetadataEntries = (
  category: DocumentCategory,
  translate?: (key: string, options?: Record<string, unknown>) => string
): MetadataEntryForm[] => {
  const t = translate ?? ((key: string) => key);
  const entries = new Map<string, MetadataEntryForm>();

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

  const schemaRequiredEntries = extractSchemaRequiredEntries(
    category.schema as Record<string, unknown>,
    category.name,
    t
  );
  schemaRequiredEntries.forEach((entry) => {
    const key = entry.key.toLowerCase();
    if (entries.has(key)) {
      const existing = entries.get(key)!;
      entries.set(key, {
        ...existing,
        hint: existing.hint ? `${existing.hint} · ${entry.hint}` : entry.hint
      });
    } else {
      entries.set(key, entry);
    }
  });

  return Array.from(entries.values());
};

const normalizeMetadataKey = (value?: string) => value?.trim().toLowerCase() ?? '';

interface UploadFormValues {
  category: string;
  issuingDate?: string;
  author?: string;
  comment?: string;
  filename?: string;
  isFinal: boolean;
  cpf: string;
  metadata: MetadataEntryForm[];
  document?: FileList;
}

export function DocumentUploadPage() {
  const navigate = useNavigate();
  const categoriesQuery = useCategories();
  const uploadMutation = useUploadDocument();
  const uploadProgress = typeof uploadMutation.progress === 'number' ? uploadMutation.progress : 0;
  const { t, i18n } = useTranslation();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<UploadFormValues>({
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
    } else {
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
      const existingIndex = currentMetadata.findIndex((field) =>
        normalizeMetadataKey(field?.key) === normalizeMetadataKey(entry.key)
      );

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
      } else {
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
        const dataRecord = data as Record<string, unknown>;
        if (typeof dataRecord.mensagem === 'string') {
          return dataRecord.mensagem;
        }
        if (typeof dataRecord.message === 'string') {
          return dataRecord.message;
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

    uploadMutation.mutate(
      {
        file,
        category: values.category,
        metadata: metadataPayload,
        isFinal: values.isFinal,
        issuingDate: values.issuingDate || undefined,
        author: values.author?.trim(),
        comment: values.comment?.trim() || undefined,
        filename
      },
      {
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
      }
    );
  });

  const buildMetadataPayload = (values: UploadFormValues) => {
    const metadata: Record<string, unknown> = {};
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

  const handleNavigateToDocument = (documentId: DocumentId) => {
    if (!documentId?.id) return;
    navigate(`/documents/${documentId.id}`);
  };

  if (categoriesQuery.isLoading) {
    return <LoadingState message={t('search.loadingCategories')} />;
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        title={t('upload.categoriesErrorTitle')}
        description={t('upload.categoriesErrorDescription')}
        onRetry={() => categoriesQuery.refetch()}
      />
    );
  }

  return (
    <div className="page-upload">
      <section className="card" style={{ marginBottom: '1rem' }}>
        <header style={{ marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>{t('upload.title')}</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>{t('upload.subtitle')}</p>
        </header>

        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-grid form-grid--two">
            <div className="input-group">
              <label htmlFor="document">{t('upload.fields.file')}</label>
              <input
                id="document"
                type="file"
                className="text-input"
                accept="*/*"
                {...register('document', { required: t('upload.validation.documentRequired') })}
              />
              {errors.document ? <span className="input-error">{errors.document.message as string}</span> : null}
            </div>

            <div className="input-group">
              <label htmlFor="filename">{t('upload.fields.fileName')}</label>
              <input
                id="filename"
                className="text-input"
                placeholder={t('upload.fields.fileNamePlaceholder')}
                {...register('filename', { required: t('upload.validation.fileNameRequired') })}
              />
              <span className="input-hint">{t('upload.fields.fileNameHint')}</span>
              {errors.filename ? <span className="input-error">{errors.filename.message as string}</span> : null}
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="category">{t('upload.fields.category')}</label>
            <select
              id="category"
              className="select-input"
              {...register('category', { required: t('upload.validation.categoryRequired') })}
            >
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category ? <span className="input-error">{errors.category.message as string}</span> : null}
          </div>

          <div className="form-grid form-grid--two">
            <div className="input-group">
              <label htmlFor="issuingDate">{t('upload.fields.issuingDate')}</label>
              <input id="issuingDate" type="date" className="text-input" {...register('issuingDate')} />
            </div>
            <div className="input-group">
              <label htmlFor="author">{t('upload.fields.author')}</label>
              <input
                id="author"
                className="text-input"
                placeholder={t('upload.fields.authorPlaceholder')}
                {...register('author', {
                  required: t('upload.validation.authorRequired'),
                  setValueAs: (value: string) => value?.trim() ?? ''
                })}
              />
              {errors.author ? <span className="input-error">{errors.author.message as string}</span> : null}
            </div>
          </div>

          <div className="form-grid form-grid--two">
            <div className="input-group">
              <label htmlFor="cpf">{t('upload.fields.cpf')}</label>
              <input
                id="cpf"
                className="text-input"
                inputMode="numeric"
                placeholder={t('search.cpfPlaceholder')}
                {...cpfRegister}
              />
              {errors.cpf ? <span className="input-error">{errors.cpf.message as string}</span> : null}
            </div>
            <div className="input-group input-group--inline">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input id="isFinal" type="checkbox" {...register('isFinal')} />
                <label htmlFor="isFinal" style={{ margin: 0 }}>{t('upload.fields.finalLabel')}</label>
              </div>
              <span className="input-hint">{t('upload.fields.finalHint')}</span>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="comment">{t('upload.fields.comment')}</label>
            <textarea
              id="comment"
              rows={4}
              className="text-input"
              style={{ resize: 'vertical' }}
              placeholder={t('upload.fields.commentPlaceholder')}
              {...register('comment')}
            />
          </div>

          <div>
            <h2 style={{ margin: '1.5rem 0 0.75rem' }}>{t('upload.metadata.sectionTitle')}</h2>
            <p style={{ margin: '0 0 1rem', color: '#475569' }}>{t('upload.metadata.description')}</p>

            <div className="metadata-extra">
              {requiredMetadata.length ? (
                <div className="metadata-section">
                  <h3 className="metadata-section__title">{t('upload.metadata.requiredTitle')}</h3>
                  {requiredMetadata.map(({ field, index }) => {
                    const valueError = errors.metadata?.[index]?.value?.message as string | undefined;
                    return (
                      <div key={field.id} className="metadata-extra__row">
                        <div className="metadata-extra__inputs">
                          <input
                            className="text-input"
                            placeholder={t('upload.metadata.keyPlaceholder')}
                            defaultValue={field.key}
                            readOnly
                            {...register(`metadata.${index}.key` as const, {
                              required: t('upload.validation.requiredField')
                            })}
                          />
                          <input
                            className="text-input"
                            placeholder={t('upload.metadata.valuePlaceholder')}
                            defaultValue={field.value}
                            {...register(`metadata.${index}.value` as const, {
                              required: t('upload.validation.requiredField')
                            })}
                          />
                        </div>
                        <div className="metadata-extra__actions">
                          {field.hint ? <span className="metadata-extra__hint">{field.hint}</span> : null}
                          {valueError ? <span className="input-error">{valueError}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="metadata-divider" />

              <div className="metadata-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 className="metadata-section__title" style={{ margin: 0 }}>{t('upload.metadata.optionalTitle')}</h3>
                  <button
                    type="button"
                    className="button"
                    onClick={() => metadataFieldArray.append({ key: '', value: '', required: false })}
                  >
                    {t('upload.metadata.addButton')}
                  </button>
                </div>
                {optionalMetadata.length ? (
                  optionalMetadata.map(({ field, index }) => {
                    const keyError = errors.metadata?.[index]?.key?.message as string | undefined;
                    const valueError = errors.metadata?.[index]?.value?.message as string | undefined;
                    return (
                      <div key={field.id} className="metadata-extra__row">
                        <div className="metadata-extra__inputs">
                          <input
                            className="text-input"
                            placeholder={t('upload.metadata.keyPlaceholder')}
                            defaultValue={field.key}
                            {...register(`metadata.${index}.key` as const)}
                          />
                          <input
                            className="text-input"
                            placeholder={t('upload.metadata.valuePlaceholder')}
                            defaultValue={field.value}
                            {...register(`metadata.${index}.value` as const)}
                          />
                        </div>
                        <div className="metadata-extra__actions">
                          {keyError ? <span className="input-error">{keyError}</span> : null}
                          {valueError ? <span className="input-error">{valueError}</span> : null}
                          {metadataFieldArray.fields.length > 1 ? (
                            <button
                              type="button"
                              className="button"
                              onClick={() => metadataFieldArray.remove(index)}
                            >
                              {t('upload.metadata.removeButton')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="metadata-empty">{t('upload.metadata.optionalEmpty')}</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              className="button button--primary"
              type="submit"
              disabled={
                isSubmitting ||
                uploadMutation.isPending ||
                uploadMutation.isUploadingToStorage
              }
            >
              {uploadMutation.isPending ? t('upload.buttons.submitting') : t('upload.buttons.submit')}
            </button>
          </div>
        </form>
      </section>

      {(uploadMutation.isUploadingToStorage || (uploadMutation.isSuccess && uploadMutation.data)) && (
        <div className="modal-overlay" role="alert" aria-live="assertive">
          <div className="modal">
            {uploadMutation.isUploadingToStorage ? (
              <>
                <h2 className="modal__title">{t('upload.progress.title')}</h2>
                <p className="modal__description">{t('upload.progress.description')}</p>
                <div className="upload-progress__bar">
                  <div
                    className="upload-progress__bar-fill"
                    style={{ width: `${Math.min(Math.max(uploadProgress, 0), 100)}%` }}
                  />
                </div>
                <span className="upload-progress__percent">
                  {t('upload.progress.percent', { value: uploadProgress })}
                </span>
              </>
            ) : null}

            {!uploadMutation.isUploadingToStorage && uploadMutation.isSuccess && uploadMutation.data ? (
              <>
                <h2 className="modal__title">{t('upload.success.title')}</h2>
                <p className="modal__description">{t('upload.success.description')}</p>
                <dl className="modal__details">
                  <div>
                    <dt>{t('upload.success.identifier')}</dt>
                    <dd>{uploadMutation.data.id}</dd>
                  </div>
                  <div>
                    <dt>{t('upload.success.version')}</dt>
                    <dd>{uploadMutation.data.version}</dd>
                  </div>
                </dl>
                <div className="modal__actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => handleNavigateToDocument(uploadMutation.data)}
                  >
                    {t('upload.success.viewDetails')}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
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
                    }}
                  >
                    {t('upload.success.newUpload')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {uploadMutation.isError ? (
        <ErrorState
          title={t('errors.uploadTitle')}
          description={errorDescription}
          onRetry={() => uploadMutation.reset()}
        />
      ) : null}
    </div>
  );
}
