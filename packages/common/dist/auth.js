"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureAuth = configureAuth;
exports.signIn = signIn;
exports.signOut = signOut;
exports.getAccessToken = getAccessToken;
exports.createAuth0Provider = createAuth0Provider;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
let provider = null;
/**
 * Configure the authentication provider to use.
 * Must be called before signIn, signOut, or getAccessToken.
 */
function configureAuth(authProvider) {
    provider = authProvider;
}
function ensureProvider() {
    if (!provider) {
        throw new Error("AuthProvider not configured. Call configureAuth() first.");
    }
    return provider;
}
/**
 * Initiate user sign-in.
 */
async function signIn() {
    const p = ensureProvider();
    return p.signIn();
}
/**
 * Sign out the current user.
 */
async function signOut() {
    const p = ensureProvider();
    return p.signOut();
}
/**
 * Retrieve an access token for authenticating API requests.
 */
async function getAccessToken() {
    const p = ensureProvider();
    return p.getAccessToken();
}
/**
 * Create an AuthProvider that uses Auth0 client credentials flow.
 */
function createAuth0Provider(config) {
    let token = null;
    let expiresAt = 0;
    const tokenUrl = `https://${config.domain}/oauth/token`;
    return {
        async signIn() {
            // no-op for client credentials
        },
        async signOut() {
            token = null;
            expiresAt = 0;
        },
        async getAccessToken() {
            const now = Date.now();
            if (token && now < expiresAt) {
                return token;
            }
            // Request a new token
            const res = await (0, cross_fetch_1.default)(tokenUrl, {
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
                throw new Error(`Invalid Auth0 response: ${JSON.stringify(data)}`);
            }
            token = data.access_token;
            expiresAt = now + data.expires_in * 1000 - 60000; // refresh 1 min early
            return token;
        },
    };
}
