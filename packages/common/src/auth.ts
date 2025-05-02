import fetch from "cross-fetch";
/**
 * Authentication provider interface.
 */
export interface AuthProvider {
    /** Perform sign-in flow. */
    signIn(): Promise<void>;
    /** Perform sign-out flow. */
    signOut(): Promise<void>;
    /** Get current access token for API calls. */
    getAccessToken(): Promise<string>;
}

let provider: AuthProvider | null = null;

/**
 * Configure the authentication provider to use.
 * Must be called before signIn, signOut, or getAccessToken.
 */
export function configureAuth(authProvider: AuthProvider | null): void {
    provider = authProvider;
}

function ensureProvider(): AuthProvider {
    if (!provider) {
        throw new Error(
            "AuthProvider not configured. Call configureAuth() first.",
        );
    }
    return provider;
}

/**
 * Initiate user sign-in.
 */
export async function signIn(): Promise<void> {
    const p = ensureProvider();
    return p.signIn();
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
    const p = ensureProvider();
    return p.signOut();
}

/**
 * Retrieve an access token for authenticating API requests.
 */
export async function getAccessToken(): Promise<string> {
    const p = ensureProvider();
    return p.getAccessToken();
}
/**
 * Configuration for Auth0 Client Credentials authentication.
 */
export interface Auth0Config {
    /** Auth0 domain (e.g., tenant.auth0.com) */
    domain: string;
    /** Client ID for the application */
    clientId: string;
    /** Client secret for the application */
    clientSecret: string;
    /** Audience (API identifier) for the token */
    audience: string;
}

/**
 * Create an AuthProvider that uses Auth0 client credentials flow.
 */
export function createAuth0Provider(config: Auth0Config): AuthProvider {
    let token: string | null = null;
    let expiresAt = 0;
    const tokenUrl = `https://${config.domain}/oauth/token`;
    return {
        async signIn(): Promise<void> {
            // no-op for client credentials
        },
        async signOut(): Promise<void> {
            token = null;
            expiresAt = 0;
        },
        async getAccessToken(): Promise<string> {
            const now = Date.now();
            if (token && now < expiresAt) {
                return token;
            }
            // Request a new token
            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grant_type: "client_credentials",
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    audience: config.audience,
                }),
            });
            if (!res.ok) {
                throw new Error(`${res.statusText}: ${await res.text()}`);
            }
            const data = await res.json();
            if (!data.access_token || !data.expires_in) {
                throw new Error(
                    `Invalid Auth0 response: ${JSON.stringify(data)}`,
                );
            }
            token = data.access_token;
            expiresAt = now + data.expires_in * 1000 - 60000; // refresh 1 min early
            return token as string;
        },
    };
}
