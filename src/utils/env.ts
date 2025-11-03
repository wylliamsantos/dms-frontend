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

function optionalEnv(key: string): string | undefined {
  const value = import.meta.env[key];
  return value && value.length > 0 ? value : undefined;
}

const legacyKeycloakAuthority = (() => {
  const url = optionalEnv('VITE_KEYCLOAK_URL');
  const realm = optionalEnv('VITE_KEYCLOAK_REALM');

  if (url && realm) {
    const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return `${normalizedUrl}/realms/${realm}`;
  }

  return undefined;
})();

const fallbackRedirectUri = optionalEnv('VITE_KEYCLOAK_REDIRECT_URI');

const fallbackClientId = optionalEnv('VITE_KEYCLOAK_CLIENT_ID');

const runtimeDefaultRedirect = (() => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return undefined;
})();

export const env = {
  documentApiBaseUrl: requireEnv('VITE_DOCUMENT_API_BASE_URL'),
  searchApiBaseUrl: requireEnv('VITE_SEARCH_API_BASE_URL'),
  defaultTransactionId: requireEnv('VITE_DEFAULT_TRANSACTION_ID', 'web-console'),
  defaultAuthorization: import.meta.env.VITE_DEFAULT_AUTH_BEARER ?? '',
  idpAuthority: requireEnv('VITE_IDP_AUTHORITY', legacyKeycloakAuthority),
  idpClientId: requireEnv('VITE_IDP_CLIENT_ID', fallbackClientId),
  idpClientSecret: optionalEnv('VITE_IDP_CLIENT_SECRET') ?? '',
  idpRedirectUri: requireEnv(
    'VITE_IDP_REDIRECT_URI',
    fallbackRedirectUri ?? runtimeDefaultRedirect
  ),
  idpPostLogoutRedirectUri: requireEnv(
    'VITE_IDP_POST_LOGOUT_REDIRECT_URI',
    fallbackRedirectUri ?? runtimeDefaultRedirect
  ),
  idpScopes: optionalEnv('VITE_IDP_SCOPES') ?? 'openid profile email',
  idpRefreshLeewaySeconds: Number(
    optionalEnv('VITE_IDP_REFRESH_LEEWAY_SECONDS') ?? '60'
  ),
  idpAutoLogin:
    (optionalEnv('VITE_IDP_AUTO_LOGIN') ?? 'true').toLowerCase() === 'true'
};
