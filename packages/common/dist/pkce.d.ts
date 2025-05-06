/** Generate a cryptographically random string of given length. */
export declare function generateRandomString(length?: number): string;
/** Create PKCE code verifier and code challenge pair. */
export declare function generatePKCECodes(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
}>;
/** Build the OAuth2 authorization URL with PKCE parameters. */
/**
 * Build the OAuth2 authorization URL with PKCE parameters.
 * @param domain Auth0 domain
 * @param clientId Client ID
 * @param redirectUri Redirect URI
 * @param email Login hint email
 * @param scope Scopes to request
 * @param codeChallenge PKCE code challenge
 * @param state State parameter
 * @param organization Auth0 organization ID
 * @returns Authorization URL
 */
export declare function buildAuthorizeUrl(domain: string, clientId: string, redirectUri: string, email: string, scope: string, codeChallenge: string, state: string, organization: string): string;
/** Exchange an authorization code for tokens via the token endpoint. */
export declare function exchangeCodeForToken(domain: string, clientId: string, code: string, codeVerifier: string, redirectUri: string): Promise<any>;
/** Refresh an access token using a refresh token. */
export declare function refreshAccessToken(domain: string, clientId: string, refreshToken: string): Promise<any>;
