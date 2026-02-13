import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from '@/i18n';

import { CategoryPayload, DocumentCategory, DocumentGroup } from '@/types/document';

const documentGroups: DocumentGroup[] = ['PERSONAL', 'LEGAL', 'CUSTOM'];
type SchemaFieldType = 'string' | 'number' | 'boolean';

interface CategoryTypeFormValues {
  name: string;
  description?: string;
  validityInDays?: string;
  requiredAttributes?: string;
}

interface SchemaFieldFormValues {
  key: string;
  type: SchemaFieldType;
  required: boolean;
  pattern?: string;
  example?: string;
}

interface CategoryFormValues {
  name: string;
  title?: string;
  description?: string;
  documentGroup?: DocumentGroup | '';
  uniqueAttributes?: string;
  businessKeyField: string;
  validityInDays?: string;
  schemaText: string;
  active: boolean;
  types: CategoryTypeFormValues[];
  schemaFields: SchemaFieldFormValues[];
}

type FormMode = 'create' | 'edit' | 'duplicate';

interface CategoryFormProps {
  mode: FormMode;
  initialData?: DocumentCategory | null;
  onSubmit: (payload: CategoryPayload) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const emptyFormValues: CategoryFormValues = {
  name: '',
  title: '',
  description: '',
  documentGroup: '',
  uniqueAttributes: '',
  businessKeyField: '',
  validityInDays: '',
  schemaText: '{\n  \n}',
  active: true,
  types: [],
  schemaFields: []
};

const toSchemaText = (schema?: Record<string, unknown>) => {
  try {
    if (!schema || Object.keys(schema).length === 0) {
      return '{\n  \n}';
    }
    return JSON.stringify(schema, null, 2);
  } catch {
    return '{\n  \n}';
  }
};

const toString = (value?: number | null) => (typeof value === 'number' ? String(value) : '');

function schemaToFields(schema?: Record<string, unknown>): SchemaFieldFormValues[] {
  if (!schema || typeof schema !== 'object') return [];

  const properties = (schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {};
  const required = new Set<string>(((schema.required as string[] | undefined) ?? []).map((item) => item.toLowerCase()));

  return Object.entries(properties).map(([key, prop]) => ({
    key,
    type: ((prop.type as SchemaFieldType) ?? 'string'),
    required: required.has(key.toLowerCase()),
    pattern: typeof prop.pattern === 'string' ? prop.pattern : '',
    example: prop.example !== undefined ? String(prop.example) : ''
  }));
}

function fieldsToSchema(fields: SchemaFieldFormValues[]): Record<string, unknown> {
  const valid = fields.filter((field) => field.key.trim().length > 0);
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of valid) {
    const key = field.key.trim();
    const prop: Record<string, unknown> = { type: field.type };
    if (field.pattern?.trim()) prop.pattern = field.pattern.trim();
    if (field.example?.trim()) {
      if (field.type === 'number') {
        const n = Number(field.example.trim());
        prop.example = Number.isFinite(n) ? n : field.example.trim();
      } else if (field.type === 'boolean') {
        prop.example = field.example.trim().toLowerCase() === 'true';
      } else {
        prop.example = field.example.trim();
      }
    }

    properties[key] = prop;
    if (field.required) required.push(key);
  }

  return {
    type: 'object',
    properties,
    required
  };
}

const buildDefaultValues = (
  category: DocumentCategory | null | undefined,
  mode: FormMode = 'create',
  copySuffix = ''
): CategoryFormValues => {
  if (!category) {
    return emptyFormValues;
  }

  const duplicateSuffix = mode === 'duplicate' ? copySuffix : '';
  const schema = (category.schema as Record<string, unknown> | undefined) ?? {};

  return {
    name: (category.name ?? '') + duplicateSuffix,
    title: category.title ?? '',
    description: category.description ?? '',
    documentGroup: category.documentGroup ?? '',
    uniqueAttributes: category.uniqueAttributes ?? '',
    businessKeyField: category.businessKeyField ?? '',
    validityInDays: toString(category.validityInDays as number | undefined),
    schemaText: toSchemaText(schema),
    active: category.active ?? true,
    schemaFields: schemaToFields(schema),
    types:
      category.types?.map((type) => ({
        name: type.name ?? '',
        description: type.description ?? '',
        validityInDays: toString(type.validityInDays as number | undefined),
        requiredAttributes: type.requiredAttributes ?? ''
      })) ?? []
  };
};

const sanitizeNumber = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sanitizeString = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export function CategoryForm({ mode, initialData, onSubmit, onCancel, isSubmitting }: CategoryFormProps) {
  const { t, i18n } = useTranslation();
  const [advancedSchemaMode, setAdvancedSchemaMode] = useState(false);

  const defaultValues = useMemo(
    () => buildDefaultValues(initialData, mode, t('categoryForm.copySuffix')),
    [initialData, mode, t, i18n.language]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setError,
    clearErrors,
    setValue
  } = useForm<CategoryFormValues>({
    defaultValues
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'types' });
  const {
    fields: schemaFields,
    append: appendSchemaField,
    remove: removeSchemaField
  } = useFieldArray({ control, name: 'schemaFields' });

  const watchedSchemaFields = watch('schemaFields');

  useEffect(() => {
    if (advancedSchemaMode) return;
    const schemaObject = fieldsToSchema(watchedSchemaFields ?? []);
    setValue('schemaText', JSON.stringify(schemaObject, null, 2), { shouldDirty: true });
  }, [advancedSchemaMode, watchedSchemaFields, setValue]);

  const submitForm = handleSubmit((values) => {
    let schemaObject: Record<string, unknown> = {};

    if (advancedSchemaMode) {
      if (values.schemaText && values.schemaText.trim().length) {
        try {
          clearErrors('schemaText');
          schemaObject = JSON.parse(values.schemaText);
        } catch {
          setError('schemaText', { type: 'manual', message: t('categoryForm.errors.invalidJson') });
          return;
        }
      }
    } else {
      schemaObject = fieldsToSchema(values.schemaFields ?? []);
    }

    const payload: CategoryPayload = {
      name: values.name.trim(),
      title: sanitizeString(values.title),
      description: sanitizeString(values.description),
      documentGroup: values.documentGroup || undefined,
      uniqueAttributes: sanitizeString(values.uniqueAttributes),
      businessKeyField: values.businessKeyField.trim(),
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

  return (
    <form onSubmit={submitForm} className="form-grid">
      <header>
        <h2 style={{ margin: 0 }}>
          {mode === 'create' && t('categoryForm.titles.create')}
          {mode === 'edit' && t('categoryForm.titles.edit')}
          {mode === 'duplicate' && t('categoryForm.titles.duplicate')}
        </h2>
        <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>{t('categoryForm.subtitle')}</p>
      </header>

      <div className="form-grid form-grid--two">
        <div className="input-group">
          <label htmlFor="category-name">{t('categoryForm.fields.name')}</label>
          <input
            id="category-name"
            className="text-input"
            placeholder={t('categoryForm.fields.namePlaceholder')}
            {...register('name', { required: t('categoryForm.errors.nameRequired') })}
          />
          {errors.name ? <span className="input-error">{errors.name.message}</span> : null}
        </div>

        <div className="input-group">
          <label htmlFor="category-title">{t('categoryForm.fields.title')}</label>
          <input
            id="category-title"
            className="text-input"
            placeholder={t('categoryForm.fields.titlePlaceholder')}
            {...register('title')}
          />
        </div>

        <div className="input-group">
          <label htmlFor="category-group">{t('categoryForm.fields.group')}</label>
          <select id="category-group" className="select-input" {...register('documentGroup')}>
            <option value="">{t('categoryForm.fields.groupPlaceholder')}</option>
            {documentGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="category-unique-attributes">{t('categoryForm.fields.uniqueAttributes')}</label>
          <input
            id="category-unique-attributes"
            className="text-input"
            placeholder={t('categoryForm.fields.uniqueAttributesPlaceholder')}
            {...register('uniqueAttributes', { required: 'Unique attributes é obrigatório' })}
          />
          <span className="input-hint">{t('categoryForm.fields.uniqueAttributesHint')}</span>
          {errors.uniqueAttributes ? <span className="input-error">{errors.uniqueAttributes.message}</span> : null}
        </div>

        <div className="input-group">
          <label htmlFor="category-business-key-field">Business key field</label>
          <input
            id="category-business-key-field"
            className="text-input"
            placeholder="Ex.: cpf, placa, renavam"
            {...register('businessKeyField', { required: 'Business key field é obrigatório' })}
          />
          {errors.businessKeyField ? <span className="input-error">{errors.businessKeyField.message}</span> : null}
        </div>

        <div className="input-group">
          <label htmlFor="category-validity">{t('categoryForm.fields.validityInDays')}</label>
          <input id="category-validity" className="text-input" inputMode="numeric" {...register('validityInDays')} />
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="category-description">{t('categoryForm.fields.description')}</label>
        <textarea
          id="category-description"
          className="text-input"
          rows={3}
          placeholder={t('categoryForm.fields.descriptionPlaceholder')}
          {...register('description')}
        />
      </div>

      <div className="metadata-divider" />

      <section className="metadata-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <h3 className="metadata-section__title" style={{ margin: 0 }}>Schema Builder</h3>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setAdvancedSchemaMode((current) => !current)}
          >
            {advancedSchemaMode ? 'Usar builder visual' : 'Modo avançado (JSON)'}
          </button>
        </div>

        {!advancedSchemaMode ? (
          <>
            <p className="input-hint">Defina os campos e gere o schema automaticamente.</p>

            {schemaFields.length === 0 ? (
              <span className="metadata-empty">Nenhum campo de schema adicionado.</span>
            ) : null}

            {schemaFields.map((field, index) => (
              <div key={field.id} className="metadata-extra__row">
                <div className="metadata-extra__inputs">
                  <input className="text-input" placeholder="Campo" {...register(`schemaFields.${index}.key` as const)} />
                  <select className="select-input" {...register(`schemaFields.${index}.type` as const)}>
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <input className="text-input" placeholder="Regex (opcional)" {...register(`schemaFields.${index}.pattern` as const)} />
                  <input className="text-input" placeholder="Exemplo (opcional)" {...register(`schemaFields.${index}.example` as const)} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '120px' }}>
                    <input type="checkbox" {...register(`schemaFields.${index}.required` as const)} /> Obrigatório
                  </label>
                </div>
                <div className="metadata-extra__actions">
                  <button type="button" className="link-button" onClick={() => removeSchemaField(index)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="button button--ghost"
              onClick={() => appendSchemaField({ key: '', type: 'string', required: false, pattern: '', example: '' })}
            >
              Adicionar campo do schema
            </button>

            <div className="input-group">
              <label htmlFor="category-schema-preview">JSON gerado (somente leitura)</label>
              <textarea id="category-schema-preview" className="text-input" rows={8} {...register('schemaText')} readOnly />
            </div>
          </>
        ) : (
          <div className="input-group">
            <label htmlFor="category-schema">{t('categoryForm.fields.schema')}</label>
            <textarea id="category-schema" className="text-input" rows={8} {...register('schemaText')} />
            <span className="input-hint">{t('categoryForm.fields.schemaHint')}</span>
            {errors.schemaText ? <span className="input-error">{errors.schemaText.message}</span> : null}
          </div>
        )}
      </section>

      <div className="metadata-divider" />

      <section className="metadata-section">
        <h3 className="metadata-section__title">{t('categoryForm.fields.typesTitle')}</h3>
        <p className="input-hint">{t('categoryForm.fields.typesDescription')}</p>

        {fields.length === 0 ? (
          <span className="metadata-empty">{t('categoryForm.fields.typesEmpty')}</span>
        ) : null}

        {fields.map((field, index) => (
          <div key={field.id} className="metadata-extra__row">
            <div className="metadata-extra__inputs">
              <input className="text-input" placeholder={t('categoryForm.fields.typeNamePlaceholder')} {...register(`types.${index}.name` as const)} />
              <input className="text-input" placeholder={t('categoryForm.fields.typeDescriptionPlaceholder')} {...register(`types.${index}.description` as const)} />
              <input className="text-input" placeholder={t('categoryForm.fields.typeValidityPlaceholder')} inputMode="numeric" {...register(`types.${index}.validityInDays` as const)} />
              <input className="text-input" placeholder={t('categoryForm.fields.typeAttributesPlaceholder')} {...register(`types.${index}.requiredAttributes` as const)} />
            </div>
            <div className="metadata-extra__actions">
              <button type="button" className="link-button" onClick={() => remove(index)}>
                {t('categoryForm.buttons.removeType')}
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="button button--ghost"
          onClick={() => append({ name: '', description: '', validityInDays: '', requiredAttributes: '' })}
        >
          {t('categoryForm.buttons.addType')}
        </button>
      </section>

      <div className="metadata-divider" />

      <div className="input-group input-group--inline">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" {...register('active')} /> {t('categoryForm.fields.activeLabel')}
        </label>
        <span className="input-hint">{t('categoryForm.fields.activeHint')}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="button" onClick={onCancel} disabled={isSubmitting}>
          {t('categoryForm.buttons.cancel')}
        </button>
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('categoryForm.buttons.saving') : t('categoryForm.buttons.save')}
        </button>
      </div>
    </form>
  );
}
