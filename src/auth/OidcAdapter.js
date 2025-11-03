import { env } from '@/utils/env';
const isBrowser = typeof window !== 'undefined';
function base64UrlEncode(input) {
    const uint8 = input instanceof Uint8Array ? input : new Uint8Array(input);
    let binary = '';
    uint8.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeJwtPayload(token) {
    const parts = token.split('.');
    if (parts.length < 2) {
        throw new Error('Invalid ID token received');
    }
    const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const json = decodeURIComponent(Array.prototype.map
        .call(atob(payload), (c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''));
    return JSON.parse(json);
}
function generateRandomString(size = 64) {
    if (!isBrowser) {
        return Math.random().toString(36).slice(2, 2 + size);
    }
    const array = new Uint8Array(size);
    window.crypto.getRandomValues(array);
    return base64UrlEncode(array).slice(0, size);
}
async function generatePkcePair() {
    const verifier = generateRandomString(96);
    if (!isBrowser) {
        return { verifier, challenge: verifier };
    }
    const encoder = new TextEncoder();
    const digest = await window.crypto.subtle.digest('SHA-256', encoder.encode(verifier));
    const challenge = base64UrlEncode(digest);
    return { verifier, challenge };
}
function parseAuthParams(url) {
    if (url.search) {
        return new URLSearchParams(url.search);
    }
    if (url.hash && url.hash.startsWith('#')) {
        return new URLSearchParams(url.hash.slice(1));
    }
    return new URLSearchParams();
}
function extractRolesFromToken(token) {
    if (!token) {
        return [];
    }
    try {
        const payload = decodeJwtPayload(token);
        const roles = new Set();
        payload.realm_access?.roles?.forEach((role) => roles.add(role));
        if (payload.resource_access) {
            Object.values(payload.resource_access).forEach((resource) => {
                resource.roles?.forEach((role) => roles.add(role));
            });
        }
        return Array.from(roles);
    }
    catch (error) {
        console.warn('[Auth] Failed to extract roles from token', error);
        return [];
    }
}
class GenericOidcAdapter {
    constructor(config) {
        this.config = config;
        this.session = { isAuthenticated: false, token: null, roles: [] };
        this.refreshTimer = null;
        this.initialized = false;
        this.initializing = null;
        this.listeners = new Set();
        this.storageKey = `oidc.session.${config.clientId}`;
        this.authRequestKey = `${this.storageKey}.request`;
    }
    async init() {
        if (!isBrowser) {
            return this.session;
        }
        if (!this.initialized) {
            if (!this.initializing) {
                this.initializing = (async () => {
                    await this.ensureMetadata();
                    await this.handlePendingCallback();
                    await this.restoreSession();
                    this.initialized = true;
                })().finally(() => {
                    this.initializing = null;
                });
            }
            try {
                await this.initializing;
            }
            catch (error) {
                this.initialized = false;
                throw error;
            }
        }
        return this.session;
    }
    async login() {
        if (!isBrowser) {
            return;
        }
        await this.ensureMetadata();
        const redirectUri = this.resolveRedirectUri();
        const { verifier, challenge } = await generatePkcePair();
        const state = generateRandomString(32);
        const nonce = generateRandomString(32);
        this.storeAuthRequest({
            state,
            codeVerifier: verifier,
            nonce,
            redirectUri,
            createdAt: Date.now()
        });
        const authEndpoint = this.metadata.authorization_endpoint;
        const authorizeUrl = new URL(authEndpoint);
        authorizeUrl.searchParams.set('client_id', this.config.clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUri);
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('scope', this.config.scope);
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('code_challenge', challenge);
        authorizeUrl.searchParams.set('code_challenge_method', 'S256');
        authorizeUrl.searchParams.set('nonce', nonce);
        window.location.assign(authorizeUrl.toString());
    }
    async logout() {
        if (!isBrowser) {
            return;
        }
        await this.ensureMetadata();
        const endSessionEndpoint = this.metadata?.end_session_endpoint;
        const redirectUri = this.config.postLogoutRedirectUri ?? this.resolveRedirectUri();
        const idToken = this.session.idToken ?? undefined;
        this.clearSession(false);
        if (endSessionEndpoint && idToken) {
            const url = new URL(endSessionEndpoint);
            url.searchParams.set('post_logout_redirect_uri', redirectUri);
            url.searchParams.set('id_token_hint', idToken);
            window.location.assign(url.toString());
        }
        else {
            window.location.assign(redirectUri);
        }
    }
    async refreshToken() {
        if (!this.session.refreshToken) {
            throw new Error('No refresh token available');
        }
        await this.performTokenRefresh(this.session.refreshToken);
        return this.session;
    }
    getSession() {
        return this.session;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.session);
        return () => {
            this.listeners.delete(listener);
        };
    }
    hasPendingAuth() {
        if (!isBrowser) {
            return false;
        }
        return Boolean(sessionStorage.getItem(this.authRequestKey));
    }
    async ensureMetadata() {
        if (this.metadata || !isBrowser) {
            return;
        }
        const discoveryUrl = `${this.config.authority.replace(/\/$/, '')}/.well-known/openid-configuration`;
        const response = await fetch(discoveryUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load OIDC discovery document: ${response.status}`);
        }
        this.metadata = (await response.json());
    }
    async handlePendingCallback() {
        if (!isBrowser) {
            return;
        }
        const url = new URL(window.location.href);
        const params = parseAuthParams(url);
        if (!params.has('code') && !params.has('error')) {
            return;
        }
        if (params.has('error')) {
            const error = params.get('error_description') ?? params.get('error') ?? 'oidc_error';
            this.clearAuthRequest();
            this.stripCallbackParameters(url);
            throw new Error(`OIDC authorization error: ${error}`);
        }
        const code = params.get('code');
        if (!code) {
            return;
        }
        const request = this.readAuthRequest();
        if (!request || request.state !== params.get('state')) {
            this.clearAuthRequest();
            this.stripCallbackParameters(url);
            throw new Error('Invalid or expired authorization state');
        }
        try {
            await this.exchangeCodeForTokens(code, request);
        }
        finally {
            this.stripCallbackParameters(url);
            this.clearAuthRequest();
        }
    }
    async exchangeCodeForTokens(code, request) {
        await this.ensureMetadata();
        const tokenEndpoint = this.metadata.token_endpoint;
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.config.clientId,
            redirect_uri: request.redirectUri,
            code,
            code_verifier: request.codeVerifier
        });
        if (this.config.clientSecret) {
            body.set('client_secret', this.config.clientSecret);
        }
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        if (!response.ok) {
            let details = '';
            try {
                details = await response.text();
            }
            catch (readError) {
                console.warn('[Auth] Unable to read token error response', readError);
            }
            throw new Error(`Failed to exchange authorization code: ${response.status}${details ? ` - ${details}` : ''}`);
        }
        const tokenSet = await response.json();
        this.verifyNonce(tokenSet.id_token, request.nonce);
        this.storeSessionFromTokenResponse(tokenSet);
    }
    async performTokenRefresh(refreshToken) {
        await this.ensureMetadata();
        const tokenEndpoint = this.metadata.token_endpoint;
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            refresh_token: refreshToken
        });
        if (this.config.clientSecret) {
            body.set('client_secret', this.config.clientSecret);
        }
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        if (!response.ok) {
            let details = '';
            try {
                details = await response.text();
            }
            catch (readError) {
                console.warn('[Auth] Unable to read refresh error response', readError);
            }
            this.clearSession(true);
            throw new Error(`Failed to refresh access token: ${response.status}${details ? ` - ${details}` : ''}`);
        }
        const tokenSet = await response.json();
        this.storeSessionFromTokenResponse(tokenSet);
    }
    storeSessionFromTokenResponse(tokenSet) {
        const accessToken = tokenSet.access_token ?? null;
        const refreshToken = tokenSet.refresh_token ?? null;
        const idToken = tokenSet.id_token ?? null;
        const expiresIn = Number(tokenSet.expires_in ?? 0);
        const expiresAt = accessToken && expiresIn ? Date.now() + expiresIn * 1000 : null;
        const stored = {
            token: accessToken,
            refreshToken,
            idToken,
            expiresAt,
            scope: tokenSet.scope ?? undefined,
            tokenType: tokenSet.token_type ?? undefined
        };
        this.persistSession(stored);
        this.updateSessionFromStored(stored, true);
    }
    storeAuthRequest(request) {
        if (!isBrowser) {
            return;
        }
        sessionStorage.setItem(this.authRequestKey, JSON.stringify(request));
    }
    readAuthRequest() {
        if (!isBrowser) {
            return null;
        }
        const raw = sessionStorage.getItem(this.authRequestKey);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        }
        catch (error) {
            console.warn('[Auth] Failed to parse stored OIDC auth request', error);
            return null;
        }
    }
    clearAuthRequest() {
        if (!isBrowser) {
            return;
        }
        sessionStorage.removeItem(this.authRequestKey);
    }
    stripCallbackParameters(url) {
        if (!isBrowser) {
            return;
        }
        const cleanUrl = `${url.origin}${url.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
    }
    persistSession(stored) {
        if (!isBrowser) {
            return;
        }
        if (!stored.token) {
            localStorage.removeItem(this.storageKey);
            return;
        }
        localStorage.setItem(this.storageKey, JSON.stringify(stored));
    }
    readStoredSession() {
        if (!isBrowser) {
            return null;
        }
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        }
        catch (error) {
            console.warn('[Auth] Failed to parse stored session', error);
            return null;
        }
    }
    async restoreSession() {
        const stored = this.readStoredSession();
        if (!stored || !stored.token) {
            this.updateSessionFromStored({ token: null, refreshToken: null, idToken: null, expiresAt: null }, false);
            return;
        }
        if (stored.expiresAt && stored.expiresAt <= Date.now()) {
            if (stored.refreshToken) {
                try {
                    await this.performTokenRefresh(stored.refreshToken);
                    return;
                }
                catch (error) {
                    console.error('[Auth] Automatic refresh failed', error);
                }
            }
            this.clearSession(true);
            return;
        }
        this.updateSessionFromStored(stored, true);
    }
    updateSessionFromStored(stored, scheduleRenewal) {
        this.session = {
            isAuthenticated: Boolean(stored.token),
            token: stored.token,
            refreshToken: stored.refreshToken,
            expiresAt: stored.expiresAt ?? null,
            idToken: stored.idToken ?? null,
            roles: extractRolesFromToken(stored.token)
        };
        if (scheduleRenewal) {
            this.scheduleRefresh();
        }
        else {
            this.clearRefreshTimer();
        }
        this.notifyListeners();
    }
    scheduleRefresh() {
        this.clearRefreshTimer();
        if (!isBrowser) {
            return;
        }
        if (!this.session.isAuthenticated || !this.session.expiresAt) {
            return;
        }
        const now = Date.now();
        const leeway = Math.max(this.config.refreshLeewaySeconds * 1000, 5000);
        const timeout = this.session.expiresAt - now - leeway;
        if (!this.session.refreshToken) {
            if (timeout <= 0) {
                this.clearSession(true);
                return;
            }
            this.refreshTimer = window.setTimeout(() => this.clearSession(true), timeout);
            return;
        }
        const triggerIn = Math.max(timeout, 1000);
        this.refreshTimer = window.setTimeout(async () => {
            try {
                if (this.session.refreshToken) {
                    await this.performTokenRefresh(this.session.refreshToken);
                }
            }
            catch (error) {
                console.error('[Auth] Token refresh failed', error);
                this.clearSession(true);
            }
        }, triggerIn);
    }
    clearSession(emit) {
        this.clearRefreshTimer();
        this.persistSession({ token: null, refreshToken: null, idToken: null, expiresAt: null });
        this.session = { isAuthenticated: false, token: null, roles: [] };
        if (emit) {
            this.notifyListeners();
        }
    }
    clearRefreshTimer() {
        if (this.refreshTimer !== null && isBrowser) {
            window.clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.session);
            }
            catch (error) {
                console.error('[Auth] Listener execution failed', error);
            }
        }
    }
    verifyNonce(idToken, expectedNonce) {
        if (!idToken || typeof idToken !== 'string') {
            return;
        }
        try {
            const payload = decodeJwtPayload(idToken);
            if (payload.nonce && payload.nonce !== expectedNonce) {
                throw new Error('Returned nonce does not match the original request');
            }
        }
        catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to verify ID token nonce');
        }
    }
    resolveRedirectUri() {
        if (!isBrowser) {
            return this.config.redirectUri ?? '';
        }
        if (this.config.redirectUri && this.config.redirectUri.length > 0) {
            return this.config.redirectUri;
        }
        return window.location.origin + window.location.pathname;
    }
}
const adapterConfig = {
    authority: env.idpAuthority,
    clientId: env.idpClientId,
    clientSecret: env.idpClientSecret || undefined,
    redirectUri: env.idpRedirectUri,
    postLogoutRedirectUri: env.idpPostLogoutRedirectUri,
    scope: env.idpScopes,
    refreshLeewaySeconds: Number.isNaN(env.idpRefreshLeewaySeconds)
        ? 60
        : Math.max(env.idpRefreshLeewaySeconds, 5)
};
export const authAdapter = new GenericOidcAdapter(adapterConfig);
