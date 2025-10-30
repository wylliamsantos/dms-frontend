function requireEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  if (value) {
    return value;
  }

  if (fallback) {
    return fallback;
  }

  throw new Error(`Missing environment variable: ${key}`);
}

export const env = {
  documentApiBaseUrl: requireEnv('VITE_DOCUMENT_API_BASE_URL'),
  searchApiBaseUrl: requireEnv('VITE_SEARCH_API_BASE_URL'),
  defaultTransactionId: requireEnv('VITE_DEFAULT_TRANSACTION_ID', 'web-console'),
  defaultAuthorization: import.meta.env.VITE_DEFAULT_AUTH_BEARER ?? ''
};
