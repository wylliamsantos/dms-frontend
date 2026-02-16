import axios from 'axios';

import { env } from '@/utils/env';

const defaultHeaders = () => {
  const headers: Record<string, string> = {
    TransactionId: env.defaultTransactionId
  };

  if (env.defaultAuthorization) {
    headers.Authorization = env.defaultAuthorization;
  }

  if (env.defaultTenantId) {
    headers['X-Tenant-Id'] = env.defaultTenantId;
  }

  return headers;
};

export const documentApi = axios.create({
  baseURL: env.documentApiBaseUrl,
  headers: defaultHeaders()
});

export const searchApi = axios.create({
  baseURL: env.searchApiBaseUrl,
  headers: defaultHeaders()
});

export function setAuthToken(token?: string | null) {
  if (token) {
    documentApi.defaults.headers.Authorization = token;
    searchApi.defaults.headers.Authorization = token;
  } else {
    delete documentApi.defaults.headers.Authorization;
    delete searchApi.defaults.headers.Authorization;
  }
}

export function setTransactionId(transactionId: string) {
  documentApi.defaults.headers.TransactionId = transactionId;
  searchApi.defaults.headers.TransactionId = transactionId;
}

export function setTenantId(tenantId?: string | null) {
  if (tenantId) {
    documentApi.defaults.headers['X-Tenant-Id'] = tenantId;
    searchApi.defaults.headers['X-Tenant-Id'] = tenantId;
  } else {
    delete documentApi.defaults.headers['X-Tenant-Id'];
    delete searchApi.defaults.headers['X-Tenant-Id'];
  }
}
