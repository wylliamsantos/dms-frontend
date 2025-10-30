import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es'];
const STORAGE_KEY = 'dms-frontend-language';
const getStoredLanguage = () => {
    if (typeof window === 'undefined') {
        return undefined;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return undefined;
    }
    return resolveLanguage(stored);
};
const resolveLanguage = (language) => {
    const match = SUPPORTED_LANGUAGES.find((lng) => language.startsWith(lng));
    return match ?? 'pt';
};
const resources = {
    pt: {
        translation: {
            navigation: {
                documents: 'Documentos',
                consult: 'Consulta',
                newDocument: 'Novo documento',
                categories: 'Categorias',
                manageCategories: 'Gerenciar categorias'
            },
            language: {
                label: 'Idioma',
                options: {
                    pt: 'Português',
                    en: 'Inglês',
                    es: 'Espanhol'
                }
            },
            common: {
                retry: 'Tentar novamente',
                cancel: 'Cancelar',
                save: 'Salvar',
                loading: 'Carregando'
            },
            errors: {
                defaultTitle: 'Algo deu errado',
                uploadTitle: 'Falha no envio',
                uploadDescription: 'Não foi possível enviar o documento. Verifique os dados e tente novamente.'
            },
            search: {
                title: 'Consulta de documentos',
                subtitle: 'Busque documentos por CPF e categoria, visualize metadados e acompanhe versões.',
                cpfLabel: 'CPF',
                cpfPlaceholder: '000.000.000-00',
                categoriesLabel: 'Categorias',
                categoriesHint: 'Segure Ctrl (ou Command) para selecionar múltiplas opções.',
                submit: 'Buscar',
                submitting: 'Buscando...',
                loadingCategories: 'Carregando categorias',
                loadingResults: 'Buscando documentos',
                categoriesErrorDescription: 'Não foi possível carregar as categorias.',
                errorTitle: 'Erro ao buscar documentos',
                errorDescription: 'Verifique as credenciais ou tente novamente mais tarde.',
                pagination: {
                    status: 'Mostrando {{start}}-{{end}} de {{total}}',
                    page: 'Página {{current}} de {{total}}',
                    previous: 'Anterior',
                    next: 'Próxima'
                }
            },
            table: {
                empty: 'Nenhum documento encontrado para os filtros fornecidos.',
                columns: {
                    document: 'Documento',
                    category: 'Categoria',
                    lastVersion: 'Última versão',
                    updatedAt: 'Atualizado em'
                },
                actions: {
                    details: 'Detalhes'
                }
            },
            upload: {
                title: 'Novo documento',
                subtitle: 'Envie um arquivo e configure categoria, metadados e opções de publicação.',
                fields: {
                    file: 'Arquivo',
                    fileName: 'Nome do arquivo',
                    fileNamePlaceholder: 'Ex.: comprovante-assinado.pdf',
                    fileNameHint: 'Utilizado como nome lógico do documento.',
                    category: 'Categoria',
                    issuingDate: 'Data de emissão',
                    author: 'Autor',
                    authorPlaceholder: 'Nome de quem envia',
                    cpf: 'CPF',
                    finalLabel: 'Marcar como versão final',
                    finalHint: 'Marcado gera versão major (ex.: 1.0). Desmarcado cria revisão minor (ex.: 0.1).',
                    comment: 'Comentário',
                    commentPlaceholder: 'Observações sobre o envio'
                },
                metadata: {
                    sectionTitle: 'Metadados adicionais',
                    description: 'Adicione pares chave/valor para enriquecer o documento. Campos vazios são ignorados.',
                    keyPlaceholder: 'Chave',
                    valuePlaceholder: 'Valor',
                    requiredTitle: 'Obrigatórios da categoria',
                    requiredHint: 'Obrigatório para a categoria {{category}}',
                    requiredHintFallback: 'Obrigatório para a categoria',
                    schemaHint: 'Obrigatório conforme schema da categoria {{category}}',
                    schemaHintFallback: 'Obrigatório conforme schema da categoria',
                    optionalTitle: 'Metadados adicionais',
                    optionalEmpty: 'Nenhum metadado adicional configurado.',
                    addButton: 'Adicionar metadado',
                    removeButton: 'Remover'
                },
                buttons: {
                    submit: 'Enviar documento',
                    submitting: 'Enviando...'
                },
                validation: {
                    documentRequired: 'Selecione um arquivo',
                    fileNameRequired: 'Informe o nome do arquivo',
                    categoryRequired: 'Selecione uma categoria',
                    authorRequired: 'Informe o autor',
                    cpfRequired: 'Informe o CPF',
                    requiredField: 'Campo obrigatório'
                },
                progress: {
                    title: 'Enviando documento',
                    description: 'O arquivo está sendo enviado para o armazenamento seguro. Mantenha esta página aberta até a conclusão.',
                    percent: '{{value}}%'
                },
                success: {
                    title: 'Documento criado com sucesso',
                    description: 'O documento foi processado. Utilize o identificador abaixo para acompanhar o fluxo.',
                    identifier: 'Identificador',
                    version: 'Versão',
                    viewDetails: 'Ver detalhes',
                    newUpload: 'Novo envio'
                },
                categoriesErrorTitle: 'Falha ao carregar categorias',
                categoriesErrorDescription: 'Não foi possível carregar as categorias disponíveis.'
            },
            preview: {
                title: 'Pré-visualização',
                selectDocument: 'Selecione um documento para visualizar.',
                unsupported: 'Formato não suportado para visualização inline.',
                loadError: 'Não foi possível carregar o conteúdo. Verifique as permissões ou o formato.',
                videoFallback: 'Seu navegador não suporta a reprodução desse vídeo inline.'
            },
            metadataPanel: {
                title: 'Informações do documento',
                noData: 'Nenhum metadado disponível.',
                sectionTitle: 'Metadados',
                fields: {
                    name: 'Nome',
                    category: 'Categoria',
                    createdAt: 'Criado em',
                    updatedAt: 'Atualizado em',
                    version: 'Versão',
                    versionType: 'Tipo de versão',
                    size: 'Tamanho',
                    mime: 'MIME'
                }
            },
            versionList: {
                title: 'Versões',
                empty: 'Nenhuma versão encontrada.',
                versionLabel: 'Versão {{version}}',
                metadata: '{{date}} · {{type}}'
            },
            details: {
                back: 'Voltar para listagem',
                invalidTitle: 'Documento inválido',
                invalidDescription: 'Identificador não informado.',
                loading: 'Carregando detalhes do documento',
                errorDescription: 'Não foi possível recuperar os detalhes do documento.',
                untitled: 'Documento sem nome',
                header: {
                    title: 'Documento',
                    category: 'Categoria',
                    createdAt: 'Criado em',
                    updatedAt: 'Atualizado em',
                    version: 'Versão atual',
                    identifier: 'Identificador'
                }
            },
            categoriesPage: {
                title: 'Categorias de documentos',
                subtitle: 'Mantenha a taxonomia de categorias alinhada com os metadados exigidos pelo negócio.',
                new: 'Nova categoria',
                feedback: {
                    deactivated: 'Categoria desativada com sucesso.',
                    reactivated: 'Categoria reativada com sucesso.',
                    toggleError: 'Não foi possível atualizar o status da categoria.',
                    updated: 'Categoria atualizada com sucesso.',
                    updateError: 'Não foi possível atualizar a categoria.',
                    created: 'Categoria criada com sucesso.',
                    createError: 'Não foi possível criar a categoria.'
                },
                error: {
                    title: 'Erro na consulta de categorias',
                    description: 'Não foi possível carregar as categorias. Tente novamente.'
                },
                table: {
                    title: 'Lista de categorias',
                    subtitle: 'Consulte informações gerais e gerencie o ciclo de vida das categorias.',
                    headers: {
                        name: 'Nome',
                        title: 'Título',
                        group: 'Grupo',
                        status: 'Status',
                        types: 'Tipos',
                        actions: 'Ações'
                    },
                    status: {
                        active: 'Ativa',
                        inactive: 'Inativa'
                    },
                    actions: {
                        edit: 'Editar',
                        duplicate: 'Duplicar',
                        deactivate: 'Desativar',
                        reactivate: 'Reativar'
                    },
                    empty: 'Nenhuma categoria cadastrada até o momento.'
                }
            },
            categoryForm: {
                titles: {
                    create: 'Nova categoria',
                    edit: 'Editar categoria',
                    duplicate: 'Duplicar categoria'
                },
                subtitle: 'Defina informações básicas, metadados e tipos associados à categoria.',
                fields: {
                    name: 'Nome',
                    namePlaceholder: 'Ex.: Contrato Padrão',
                    title: 'Título exibido',
                    titlePlaceholder: 'Nome amigável para exibição',
                    description: 'Descrição',
                    descriptionPlaceholder: 'Descreva quando usar esta categoria',
                    group: 'Grupo',
                    groupPlaceholder: 'Selecione',
                    uniqueAttributes: 'Atributos únicos',
                    uniqueAttributesPlaceholder: 'Lista separada por vírgula',
                    uniqueAttributesHint: 'Combine com o formulário de upload para exigir metadados.',
                    validityInDays: 'Validade (dias)',
                    schema: 'Esquema de metadados (JSON)',
                    schemaHint: 'Utilize JSON válido para refletir o esquema armazenado no MongoDB.',
                    typesTitle: 'Tipos associados',
                    typesDescription: 'Configure variações da categoria e os atributos obrigatórios de cada tipo.',
                    typesEmpty: 'Nenhum tipo configurado no momento.',
                    typeNamePlaceholder: 'Nome do tipo',
                    typeDescriptionPlaceholder: 'Descrição',
                    typeValidityPlaceholder: 'Validade',
                    typeAttributesPlaceholder: 'Atributos obrigatórios',
                    activeLabel: 'Categoria ativa',
                    activeHint: 'Categorias inativas ficam ocultas na tela de upload.'
                },
                buttons: {
                    addType: 'Adicionar tipo',
                    removeType: 'Remover',
                    cancel: 'Cancelar',
                    saving: 'Salvando...',
                    save: 'Salvar categoria'
                },
                errors: {
                    nameRequired: 'Informe o nome da categoria',
                    invalidJson: 'JSON inválido. Ajuste o conteúdo do esquema.'
                },
                copySuffix: ' (cópia)'
            }
        }
    },
    en: {
        translation: {
            navigation: {
                documents: 'Documents',
                consult: 'Search',
                newDocument: 'New document',
                categories: 'Categories',
                manageCategories: 'Manage categories'
            },
            language: {
                label: 'Language',
                options: {
                    pt: 'Portuguese',
                    en: 'English',
                    es: 'Spanish'
                }
            },
            common: {
                retry: 'Try again',
                cancel: 'Cancel',
                save: 'Save',
                loading: 'Loading'
            },
            errors: {
                defaultTitle: 'Something went wrong',
                uploadTitle: 'Upload failed',
                uploadDescription: 'We could not upload the document. Check the data and try again.'
            },
            search: {
                title: 'Document search',
                subtitle: 'Search documents by CPF and category, see metadata and track versions.',
                cpfLabel: 'CPF',
                cpfPlaceholder: '000.000.000-00',
                categoriesLabel: 'Categories',
                categoriesHint: 'Hold Ctrl (or Command) to select multiple options.',
                submit: 'Search',
                submitting: 'Searching...',
                loadingCategories: 'Loading categories',
                loadingResults: 'Searching documents',
                categoriesErrorDescription: 'Could not load the categories.',
                errorTitle: 'Error searching documents',
                errorDescription: 'Check your credentials or try again later.',
                pagination: {
                    status: 'Showing {{start}}-{{end}} of {{total}}',
                    page: 'Page {{current}} of {{total}}',
                    previous: 'Previous',
                    next: 'Next'
                }
            },
            table: {
                empty: 'No documents were found for the selected filters.',
                columns: {
                    document: 'Document',
                    category: 'Category',
                    lastVersion: 'Latest version',
                    updatedAt: 'Updated at'
                },
                actions: {
                    details: 'Details'
                }
            },
            upload: {
                title: 'New document',
                subtitle: 'Upload a file and configure category, metadata and publication options.',
                fields: {
                    file: 'File',
                    fileName: 'File name',
                    fileNamePlaceholder: 'e.g. signed-receipt.pdf',
                    fileNameHint: 'Used as the logical name of the document.',
                    category: 'Category',
                    issuingDate: 'Issuing date',
                    author: 'Author',
                    authorPlaceholder: 'Sender name',
                    cpf: 'CPF',
                    finalLabel: 'Mark as final version',
                    finalHint: 'Checked creates a major version (e.g. 1.0). Unchecked creates a minor revision (e.g. 0.1).',
                    comment: 'Comment',
                    commentPlaceholder: 'Notes about the upload'
                },
                metadata: {
                    sectionTitle: 'Additional metadata',
                    description: 'Add key/value pairs to enrich the document. Empty fields are ignored.',
                    keyPlaceholder: 'Key',
                    valuePlaceholder: 'Value',
                    requiredTitle: 'Category required fields',
                    requiredHint: 'Required for category {{category}}',
                    requiredHintFallback: 'Required for the category',
                    schemaHint: 'Required according to the schema for category {{category}}',
                    schemaHintFallback: 'Required according to the category schema',
                    optionalTitle: 'Additional metadata',
                    optionalEmpty: 'No additional metadata configured.',
                    addButton: 'Add metadata',
                    removeButton: 'Remove'
                },
                buttons: {
                    submit: 'Upload document',
                    submitting: 'Uploading...'
                },
                validation: {
                    documentRequired: 'Select a file',
                    fileNameRequired: 'Provide the file name',
                    categoryRequired: 'Select a category',
                    authorRequired: 'Provide the author',
                    cpfRequired: 'Provide the CPF',
                    requiredField: 'This field is required'
                },
                progress: {
                    title: 'Uploading document',
                    description: 'The file is being sent to the secure storage. Keep this page open until it finishes.',
                    percent: '{{value}}%'
                },
                success: {
                    title: 'Document created successfully',
                    description: 'The document was processed. Use the identifier below to follow the workflow.',
                    identifier: 'Identifier',
                    version: 'Version',
                    viewDetails: 'View details',
                    newUpload: 'New upload'
                },
                categoriesErrorTitle: 'Failed to load categories',
                categoriesErrorDescription: 'We could not load the available categories.'
            },
            preview: {
                title: 'Preview',
                selectDocument: 'Select a document to preview.',
                unsupported: 'Format not supported for inline preview.',
                loadError: 'Could not load the content. Check permissions or file format.',
                videoFallback: 'Your browser cannot play this video inline.'
            },
            metadataPanel: {
                title: 'Document information',
                noData: 'No metadata available.',
                sectionTitle: 'Metadata',
                fields: {
                    name: 'Name',
                    category: 'Category',
                    createdAt: 'Created at',
                    updatedAt: 'Updated at',
                    version: 'Version',
                    versionType: 'Version type',
                    size: 'Size',
                    mime: 'MIME'
                }
            },
            versionList: {
                title: 'Versions',
                empty: 'No versions found.',
                versionLabel: 'Version {{version}}',
                metadata: '{{date}} · {{type}}'
            },
            details: {
                back: 'Back to list',
                invalidTitle: 'Invalid document',
                invalidDescription: 'Identifier was not informed.',
                loading: 'Loading document details',
                errorDescription: 'We could not retrieve the document details.',
                untitled: 'Untitled document',
                header: {
                    title: 'Document',
                    category: 'Category',
                    createdAt: 'Created at',
                    updatedAt: 'Updated at',
                    version: 'Current version',
                    identifier: 'Identifier'
                }
            },
            categoriesPage: {
                title: 'Document categories',
                subtitle: 'Keep the category taxonomy aligned with the business-required metadata.',
                new: 'New category',
                feedback: {
                    deactivated: 'Category deactivated successfully.',
                    reactivated: 'Category reactivated successfully.',
                    toggleError: 'Could not update the category status.',
                    updated: 'Category updated successfully.',
                    updateError: 'Could not update the category.',
                    created: 'Category created successfully.',
                    createError: 'Could not create the category.'
                },
                error: {
                    title: 'Category lookup error',
                    description: 'We could not load the categories. Try again.'
                },
                table: {
                    title: 'Category list',
                    subtitle: 'Check general information and manage the category lifecycle.',
                    headers: {
                        name: 'Name',
                        title: 'Title',
                        group: 'Group',
                        status: 'Status',
                        types: 'Types',
                        actions: 'Actions'
                    },
                    status: {
                        active: 'Active',
                        inactive: 'Inactive'
                    },
                    actions: {
                        edit: 'Edit',
                        duplicate: 'Duplicate',
                        deactivate: 'Deactivate',
                        reactivate: 'Reactivate'
                    },
                    empty: 'No categories registered yet.'
                }
            },
            categoryForm: {
                titles: {
                    create: 'New category',
                    edit: 'Edit category',
                    duplicate: 'Duplicate category'
                },
                subtitle: 'Provide basic information, metadata and types associated with the category.',
                fields: {
                    name: 'Name',
                    namePlaceholder: 'e.g. Standard Contract',
                    title: 'Display title',
                    titlePlaceholder: 'Friendly display name',
                    description: 'Description',
                    descriptionPlaceholder: 'Describe when to use this category',
                    group: 'Group',
                    groupPlaceholder: 'Select',
                    uniqueAttributes: 'Unique attributes',
                    uniqueAttributesPlaceholder: 'Comma-separated list',
                    uniqueAttributesHint: 'Align with the upload form to require metadata.',
                    validityInDays: 'Validity (days)',
                    schema: 'Metadata schema (JSON)',
                    schemaHint: 'Use valid JSON to reflect the schema stored in MongoDB.',
                    typesTitle: 'Associated types',
                    typesDescription: 'Configure category variations and the required attributes of each type.',
                    typesEmpty: 'No types configured yet.',
                    typeNamePlaceholder: 'Type name',
                    typeDescriptionPlaceholder: 'Description',
                    typeValidityPlaceholder: 'Validity',
                    typeAttributesPlaceholder: 'Required attributes',
                    activeLabel: 'Category active',
                    activeHint: 'Inactive categories are hidden on the upload screen.'
                },
                buttons: {
                    addType: 'Add type',
                    removeType: 'Remove',
                    cancel: 'Cancel',
                    saving: 'Saving...',
                    save: 'Save category'
                },
                errors: {
                    nameRequired: 'Provide the category name',
                    invalidJson: 'Invalid JSON. Fix the schema content.'
                },
                copySuffix: ' (copy)'
            }
        }
    },
    es: {
        translation: {
            navigation: {
                documents: 'Documentos',
                consult: 'Consulta',
                newDocument: 'Nuevo documento',
                categories: 'Categorías',
                manageCategories: 'Administrar categorías'
            },
            language: {
                label: 'Idioma',
                options: {
                    pt: 'Portugués',
                    en: 'Inglés',
                    es: 'Español'
                }
            },
            common: {
                retry: 'Intentar de nuevo',
                cancel: 'Cancelar',
                save: 'Guardar',
                loading: 'Cargando'
            },
            errors: {
                defaultTitle: 'Ocurrió un problema',
                uploadTitle: 'Error al enviar',
                uploadDescription: 'No fue posible enviar el documento. Verifique los datos e inténtelo nuevamente.'
            },
            search: {
                title: 'Consulta de documentos',
                subtitle: 'Busque documentos por CPF y categoría, vea metadatos y acompañe versiones.',
                cpfLabel: 'CPF',
                cpfPlaceholder: '000.000.000-00',
                categoriesLabel: 'Categorías',
                categoriesHint: 'Mantenga presionado Ctrl (o Command) para seleccionar múltiples opciones.',
                submit: 'Buscar',
                submitting: 'Buscando...',
                loadingCategories: 'Cargando categorías',
                loadingResults: 'Buscando documentos',
                categoriesErrorDescription: 'No fue posible cargar las categorías.',
                errorTitle: 'Error al buscar documentos',
                errorDescription: 'Verifique sus credenciales o inténtelo más tarde.',
                pagination: {
                    status: 'Mostrando {{start}}-{{end}} de {{total}}',
                    page: 'Página {{current}} de {{total}}',
                    previous: 'Anterior',
                    next: 'Siguiente'
                }
            },
            table: {
                empty: 'No se encontraron documentos para los filtros seleccionados.',
                columns: {
                    document: 'Documento',
                    category: 'Categoría',
                    lastVersion: 'Última versión',
                    updatedAt: 'Actualizado el'
                },
                actions: {
                    details: 'Detalles'
                }
            },
            upload: {
                title: 'Nuevo documento',
                subtitle: 'Suba un archivo y configure la categoría, metadatos y opciones de publicación.',
                fields: {
                    file: 'Archivo',
                    fileName: 'Nombre del archivo',
                    fileNamePlaceholder: 'Ej.: recibo-firmado.pdf',
                    fileNameHint: 'Se usa como nombre lógico del documento.',
                    category: 'Categoría',
                    issuingDate: 'Fecha de emisión',
                    author: 'Autor',
                    authorPlaceholder: 'Nombre de quien envía',
                    cpf: 'CPF',
                    finalLabel: 'Marcar como versión final',
                    finalHint: 'Marcado genera una versión mayor (ej.: 1.0). Desmarcado crea una revisión menor (ej.: 0.1).',
                    comment: 'Comentario',
                    commentPlaceholder: 'Observaciones sobre el envío'
                },
                metadata: {
                    sectionTitle: 'Metadatos adicionales',
                    description: 'Agregue pares clave/valor para enriquecer el documento. Los campos vacíos se ignoran.',
                    keyPlaceholder: 'Clave',
                    valuePlaceholder: 'Valor',
                    requiredTitle: 'Obligatorios de la categoría',
                    requiredHint: 'Obligatorio para la categoría {{category}}',
                    requiredHintFallback: 'Obligatorio para la categoría',
                    schemaHint: 'Obligatorio según el esquema de la categoría {{category}}',
                    schemaHintFallback: 'Obligatorio según el esquema de la categoría',
                    optionalTitle: 'Metadatos adicionales',
                    optionalEmpty: 'No hay metadatos adicionales configurados.',
                    addButton: 'Agregar metadato',
                    removeButton: 'Eliminar'
                },
                buttons: {
                    submit: 'Enviar documento',
                    submitting: 'Enviando...'
                },
                validation: {
                    documentRequired: 'Seleccione un archivo',
                    fileNameRequired: 'Informe el nombre del archivo',
                    categoryRequired: 'Seleccione una categoría',
                    authorRequired: 'Informe el autor',
                    cpfRequired: 'Informe el CPF',
                    requiredField: 'Campo obligatorio'
                },
                progress: {
                    title: 'Enviando documento',
                    description: 'El archivo se está enviando al almacenamiento seguro. Mantenga esta página abierta hasta finalizar.',
                    percent: '{{value}}%'
                },
                success: {
                    title: 'Documento creado con éxito',
                    description: 'El documento fue procesado. Utilice el identificador para seguir el flujo.',
                    identifier: 'Identificador',
                    version: 'Versión',
                    viewDetails: 'Ver detalles',
                    newUpload: 'Nuevo envío'
                },
                categoriesErrorTitle: 'Error al cargar categorías',
                categoriesErrorDescription: 'No fue posible cargar las categorías disponibles.'
            },
            preview: {
                title: 'Previsualización',
                selectDocument: 'Seleccione un documento para visualizar.',
                unsupported: 'Formato no soportado para visualización en línea.',
                loadError: 'No fue posible cargar el contenido. Verifique permisos o formato.',
                videoFallback: 'Su navegador no admite la reproducción de este video en línea.'
            },
            metadataPanel: {
                title: 'Información del documento',
                noData: 'No hay metadatos disponibles.',
                sectionTitle: 'Metadatos',
                fields: {
                    name: 'Nombre',
                    category: 'Categoría',
                    createdAt: 'Creado el',
                    updatedAt: 'Actualizado el',
                    version: 'Versión',
                    versionType: 'Tipo de versión',
                    size: 'Tamaño',
                    mime: 'MIME'
                }
            },
            versionList: {
                title: 'Versiones',
                empty: 'No se encontraron versiones.',
                versionLabel: 'Versión {{version}}',
                metadata: '{{date}} · {{type}}'
            },
            details: {
                back: 'Volver a la lista',
                invalidTitle: 'Documento inválido',
                invalidDescription: 'Identificador no informado.',
                loading: 'Cargando detalles del documento',
                errorDescription: 'No fue posible recuperar los detalles del documento.',
                untitled: 'Documento sin nombre',
                header: {
                    title: 'Documento',
                    category: 'Categoría',
                    createdAt: 'Creado el',
                    updatedAt: 'Actualizado el',
                    version: 'Versión actual',
                    identifier: 'Identificador'
                }
            },
            categoriesPage: {
                title: 'Categorías de documentos',
                subtitle: 'Mantenga la taxonomía de categorías alineada con los metadatos requeridos por el negocio.',
                new: 'Nueva categoría',
                feedback: {
                    deactivated: 'Categoría desactivada con éxito.',
                    reactivated: 'Categoría reactivada con éxito.',
                    toggleError: 'No fue posible actualizar el estado de la categoría.',
                    updated: 'Categoría actualizada con éxito.',
                    updateError: 'No fue posible actualizar la categoría.',
                    created: 'Categoría creada con éxito.',
                    createError: 'No fue posible crear la categoría.'
                },
                error: {
                    title: 'Error al consultar categorías',
                    description: 'No fue posible cargar las categorías. Inténtelo nuevamente.'
                },
                table: {
                    title: 'Lista de categorías',
                    subtitle: 'Consulte información general y administre el ciclo de vida de las categorías.',
                    headers: {
                        name: 'Nombre',
                        title: 'Título',
                        group: 'Grupo',
                        status: 'Estado',
                        types: 'Tipos',
                        actions: 'Acciones'
                    },
                    status: {
                        active: 'Activa',
                        inactive: 'Inactiva'
                    },
                    actions: {
                        edit: 'Editar',
                        duplicate: 'Duplicar',
                        deactivate: 'Desactivar',
                        reactivate: 'Reactivar'
                    },
                    empty: 'Aún no hay categorías registradas.'
                }
            },
            categoryForm: {
                titles: {
                    create: 'Nueva categoría',
                    edit: 'Editar categoría',
                    duplicate: 'Duplicar categoría'
                },
                subtitle: 'Defina información básica, metadatos y tipos asociados a la categoría.',
                fields: {
                    name: 'Nombre',
                    namePlaceholder: 'Ej.: Contrato Estándar',
                    title: 'Título para mostrar',
                    titlePlaceholder: 'Nombre amigable para mostrar',
                    description: 'Descripción',
                    descriptionPlaceholder: 'Describa cuándo usar esta categoría',
                    group: 'Grupo',
                    groupPlaceholder: 'Seleccione',
                    uniqueAttributes: 'Atributos únicos',
                    uniqueAttributesPlaceholder: 'Lista separada por comas',
                    uniqueAttributesHint: 'Alinee con el formulario de envío para exigir metadatos.',
                    validityInDays: 'Validez (días)',
                    schema: 'Esquema de metadatos (JSON)',
                    schemaHint: 'Use JSON válido para reflejar el esquema almacenado en MongoDB.',
                    typesTitle: 'Tipos asociados',
                    typesDescription: 'Configure variaciones de la categoría y los atributos obligatorios de cada tipo.',
                    typesEmpty: 'No hay tipos configurados por el momento.',
                    typeNamePlaceholder: 'Nombre del tipo',
                    typeDescriptionPlaceholder: 'Descripción',
                    typeValidityPlaceholder: 'Validez',
                    typeAttributesPlaceholder: 'Atributos obligatorios',
                    activeLabel: 'Categoría activa',
                    activeHint: 'Las categorías inactivas se ocultan en la pantalla de envío.'
                },
                buttons: {
                    addType: 'Agregar tipo',
                    removeType: 'Eliminar',
                    cancel: 'Cancelar',
                    saving: 'Guardando...',
                    save: 'Guardar categoría'
                },
                errors: {
                    nameRequired: 'Informe el nombre de la categoría',
                    invalidJson: 'JSON inválido. Ajuste el contenido del esquema.'
                },
                copySuffix: ' (copia)'
            }
        }
    }
};
const translate = (language, key, options) => {
    const segments = key.split('.');
    let current = resources[language]?.translation;
    for (const segment of segments) {
        if (current && typeof current === 'object' && segment in current) {
            current = current[segment];
        }
        else {
            current = undefined;
            break;
        }
    }
    if (typeof current !== 'string') {
        return key;
    }
    if (!options) {
        return current;
    }
    return current.replace(/{{(.*?)}}/g, (_, group) => {
        const trimmed = group.trim();
        const value = options[trimmed];
        return typeof value === 'undefined' ? '' : String(value);
    });
};
const I18nContext = createContext(undefined);
export function I18nProvider({ children }) {
    const [language, setLanguage] = useState(() => getStoredLanguage() ?? 'pt');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, language);
        }
    }, [language]);
    const contextValue = useMemo(() => ({ language, setLanguage }), [language]);
    return _jsx(I18nContext.Provider, { value: contextValue, children: children });
}
export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    const { language, setLanguage } = context;
    const t = useCallback((key, options) => translate(language, key, options), [language]);
    const changeLanguage = useCallback((next) => {
        setLanguage(resolveLanguage(next));
    }, [setLanguage]);
    return {
        t,
        i18n: {
            language,
            changeLanguage
        },
        changeLanguage
    };
}
