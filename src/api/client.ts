import axios from 'axios';

import { env } from '@/utils/env';

const defaultHeaders = () => {
  const headers: Record<string, string> = {
    TransactionId: env.defaultTransactionId
  };

  if (env.defaultAuthorization) {
    headers.Authorization = env.defaultAuthorization;
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

export function setAuthToken(token: string) {
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
