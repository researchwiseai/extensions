import { configureClient } from 'pulse-common/api';
import { getAccessToken, configureAuth } from 'pulse-common/auth';

import { setupExcelPKCEAuth } from '../auth/excelPkceAuthProvider';
import { getRelativeUrl } from './relativeUrl';

export const AUTH0_DOMAIN = 'research-wise-ai-eu.eu.auth0.com';
export const AUTH0_CLIENT_ID = 'kcQuNXgTeKSzztl8kGm5zwJ0RQeX7w1O';
export const AUTH_SCOPE = 'openid profile email offline_access';

export const WEB_BASE_URL = 'https://researchwiseai.com';
export const API_BASE_URL = 'https://pulse.researchwiseai.com';
export const ORG_LOOKUP_PATH = '/users';
export const REGISTER_URL = `${WEB_BASE_URL}/register`;
export const MORE_INFO_URL = `${WEB_BASE_URL}/pulse/extensions/excel`;
export const WARMUP_EMAIL = 'support@researchwiseai.com';

const SESSION_EMAIL_KEY = 'user-email';
const SESSION_ORG_KEY = 'org-id';
const SESSION_TOKEN_KEY = 'pkce_token';

let configuredSessionKey: string | null = null;
let clientConfigured = false;

export interface PulseAuthSession {
    email: string;
    organization: string;
}

export function getAuthRedirectUri(): string {
    return getRelativeUrl('auth-callback.html');
}

export function readStoredSession(): PulseAuthSession | null {
    const email = sessionStorage.getItem(SESSION_EMAIL_KEY);
    const organization = sessionStorage.getItem(SESSION_ORG_KEY);
    if (!email || !organization) {
        return null;
    }
    return { email, organization };
}

export function persistStoredSession(session: PulseAuthSession): void {
    sessionStorage.setItem(SESSION_EMAIL_KEY, session.email);
    sessionStorage.setItem(SESSION_ORG_KEY, session.organization);
}

export function clearStoredSession(): void {
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
    sessionStorage.removeItem(SESSION_ORG_KEY);
}

export function clearStoredToken(): void {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

export function hasStoredToken(): boolean {
    return Boolean(sessionStorage.getItem(SESSION_TOKEN_KEY));
}

function configureExcelAuth(session: PulseAuthSession, redirectUri?: string) {
    setupExcelPKCEAuth({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        email: session.email,
        redirectUri: redirectUri ?? getAuthRedirectUri(),
        scope: AUTH_SCOPE,
        organization: session.organization,
    });
}

function configureApiClient(): void {
    configureClient({ baseUrl: API_BASE_URL, getAccessToken });
    clientConfigured = true;
}

export function setupPulseAuthProvider(
    session: PulseAuthSession,
    redirectUri?: string,
): void {
    const key = `${session.email}|${session.organization}`;
    configureExcelAuth(session, redirectUri);
    configuredSessionKey = key;
    if (!clientConfigured) {
        configureApiClient();
    }
}

export function clearPulseAuthState(): void {
    clearStoredToken();
    clearStoredSession();
    configuredSessionKey = null;
    clientConfigured = false;
    configureAuth(null);
}

/**
 * Ensure the Excel PKCE provider and API client are configured for the current session.
 * @returns true when configuration succeeded (session + token present), false otherwise.
 */
export function ensurePulseAuthConfigured(requireToken = true): boolean {
    const session = readStoredSession();
    if (!session) {
        return false;
    }
    if (requireToken && !hasStoredToken()) {
        return false;
    }
    const key = `${session.email}|${session.organization}`;
    if (configuredSessionKey !== key) {
        configureExcelAuth(session);
        configuredSessionKey = key;
    }
    if (!clientConfigured) {
        configureApiClient();
    }
    return true;
}

export function restorePulseAuthFromStorage(): boolean {
    const ok = ensurePulseAuthConfigured();
    if (!ok) {
        // Reset partial state to avoid inconsistent sessions later on.
        const hasSession = Boolean(readStoredSession());
        const hasToken = hasStoredToken();
        if (hasSession !== hasToken) {
            clearStoredToken();
            clearStoredSession();
        }
    }
    return ok;
}
