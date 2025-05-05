// OAuth2 PKCE helpers: generate code verifier/challenge, build URLs, exchange tokens.
// Uses Web Crypto API and cross-fetch for HTTP requests.
import { fetchFn } from './apiClient';

/** Encode a buffer (Uint8Array) to a Base64URL string. */
function base64UrlEncode(buffer: Uint8Array): string {
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
export function generateRandomString(length = 43): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js
    const cryptoNode = require('crypto');
    const buf = cryptoNode.randomBytes(length);
    buf.forEach((b: number, i: number) => { array[i] = b; });
  }
  return base64UrlEncode(array);
}

/** Create PKCE code verifier and code challenge pair. */
export async function generatePKCECodes(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateRandomString(64);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await (crypto.subtle || (require('crypto').webcrypto.subtle))
    .digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const codeChallenge = base64UrlEncode(hashArray);
  return { codeVerifier, codeChallenge };
}

/** Build the OAuth2 authorization URL with PKCE parameters. */
export function buildAuthorizeUrl(
  domain: string,
  clientId: string,
  redirectUri: string,
  email: string,
  scope: string,
  codeChallenge: string,
  state: string,
): string {
  const url = new URL(`https://${domain}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('audience', 'https://dev.core.researchwiseai.com/pulse/v1');
  url.searchParams.set('scope', scope);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('login_hint', email);
  url.searchParams.set('organization', 'org_VpBsMIGiuBPZZWLF');
  return url.toString();
}

/** Exchange an authorization code for tokens via the token endpoint. */
export async function exchangeCodeForToken(
  domain: string,
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<any> {
  const url = `https://${domain}/oauth/token`;
  const res = await fetchFn(url, {
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
export async function refreshAccessToken(
  domain: string,
  clientId: string,
  refreshToken: string,
): Promise<any> {
  const url = `https://${domain}/oauth/token`;
  const res = await fetchFn(url, {
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