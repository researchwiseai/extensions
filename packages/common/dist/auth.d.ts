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
/**
 * Configure the authentication provider to use.
 * Must be called before signIn, signOut, or getAccessToken.
 */
export declare function configureAuth(authProvider: AuthProvider | null): void;
/**
 * Initiate user sign-in.
 */
export declare function signIn(): Promise<void>;
/**
 * Sign out the current user.
 */
export declare function signOut(): Promise<void>;
/**
 * Retrieve an access token for authenticating API requests.
 */
export declare function getAccessToken(): Promise<string>;
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
export declare function createAuth0Provider(config: Auth0Config): AuthProvider;
