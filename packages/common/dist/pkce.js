"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomString = generateRandomString;
exports.generatePKCECodes = generatePKCECodes;
exports.buildAuthorizeUrl = buildAuthorizeUrl;
exports.exchangeCodeForToken = exchangeCodeForToken;
exports.refreshAccessToken = refreshAccessToken;
// OAuth2 PKCE helpers: generate code verifier/challenge, build URLs, exchange tokens.
// Uses Web Crypto API and cross-fetch for HTTP requests.
const apiClient_1 = require("./apiClient");
/** Encode a buffer (Uint8Array) to a Base64URL string. */
function base64UrlEncode(buffer) {
    // Convert to binary string
    let str = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    // Base64
    const b64 = typeof btoa === 'function'
        ? btoa(str)
        : Buffer.from(str, 'binary').toString('base64');
    // URL-safe
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Generate a cryptographically random string of given length. */
function generateRandomString(length = 43) {
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    }
    else {
        // Fallback for Node.js
        const cryptoNode = require('crypto');
        const buf = cryptoNode.randomBytes(length);
        buf.forEach((b, i) => {
            array[i] = b;
        });
    }
    return base64UrlEncode(array);
}
/** Create PKCE code verifier and code challenge pair. */
async function generatePKCECodes() {
    const codeVerifier = generateRandomString(64);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await (crypto.subtle || require('crypto').webcrypto.subtle).digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const codeChallenge = base64UrlEncode(hashArray);
    return { codeVerifier, codeChallenge };
}
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
function buildAuthorizeUrl(domain, clientId, redirectUri, email, scope, codeChallenge, state, organization, audience) {
    const url = new URL(`https://${domain}/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('audience', audience ? audience : 'https://core.researchwiseai.com/pulse/v1');
    url.searchParams.set('scope', scope);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);
    url.searchParams.set('login_hint', email);
    // Include organization for Auth0
    url.searchParams.set('organization', organization);
    return url.toString();
}
/** Exchange an authorization code for tokens via the token endpoint. */
async function exchangeCodeForToken(domain, clientId, code, codeVerifier, redirectUri) {
    const url = `https://${domain}/oauth/token`;
    const res = await (0, apiClient_1.fetchFn)(url, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: clientId,
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
        }),
    });
    if (!res.ok) {
        throw new Error(`Token exchange failed: ${res.status} ${res.statusText}: ${await res.text()}`);
    }
    return res.json();
}
/** Refresh an access token using a refresh token. */
async function refreshAccessToken(domain, clientId, refreshToken) {
    const url = `https://${domain}/oauth/token`;
    const res = await (0, apiClient_1.fetchFn)(url, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: clientId,
            refresh_token: refreshToken,
        }),
    });
    if (!res.ok) {
        throw new Error(`Refresh token failed: ${res.status} ${res.statusText}: ${await res.text()}`);
    }
    return res.json();
}
