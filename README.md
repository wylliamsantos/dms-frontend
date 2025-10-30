# DMS Frontend

Console web para explorar documentos e metadados expostos pelos serviços `dms-document-service` e `dms-search-service`.

## Tecnologias

- React 18 + TypeScript
- Vite 5
- React Query para data-fetching
- React Router para navegação

## Como executar

1. Copie `.env.example` para `.env.local` e ajuste as URLs:

   ```bash
   cp .env.example .env.local
   ```

2. Instale as dependências e rode o servidor de desenvolvimento:

   ```bash
   npm install
   npm run dev
   ```

3. A aplicação estará disponível em `http://localhost:5173` (ou porta definida em `VITE_PORT`).

## Fluxos suportados

- Consulta de documentos por CPF e categoria (usa `/v1/search/byCpf`).
- Visualização da ficha do documento, incluindo metadados e histórico de versões.
- Pré-visualização inline para PDFs e imagens via `/v1/documents/{id}/{version}/base64`.

## Estrutura

- `src/api`: clientes HTTP e funções para integrar com os serviços backend.
- `src/hooks`: hooks que encapsulam React Query.
- `src/pages`: telas principais (`SearchPage`, `DocumentDetailsPage`).
- `src/components`: componentes reutilizáveis (tabela, painel de metadados, visualização de versões).

## Próximos passos sugeridos

- Implementar paginação real na listagem considerando os metadados retornados pelo backend.
- Adicionar autenticação real (OpenID Connect) em vez de cabeçalho manual.
- Testes automatizados com Vitest/React Testing Library.
