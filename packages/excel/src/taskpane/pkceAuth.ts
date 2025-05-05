import { AuthProvider, configureAuth } from "pulse-common/auth";

import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  generatePKCECodes,
  generateRandomString,
  refreshAccessToken,
} from "pulse-common/pkce";

/**
 * Excel-specific OAuth2 PKCE AuthProvider using Office Dialog API.
 */
export class ExcelPKCEAuthProvider implements AuthProvider {
  private domain: string;
  private clientId: string;
  private redirectUri: string;
  private email: string;
  private scope: string;
  // Auth0 organization ID for tenant
  private organization: string;

  constructor(opts: {
    domain: string;
    clientId: string;
    redirectUri: string;
    email: string;
    scope: string;
    organization: string;
  }) {
    this.domain = opts.domain;
    this.clientId = opts.clientId;
    this.redirectUri = opts.redirectUri;
    this.email = opts.email;
    this.scope = opts.scope;
    this.organization = opts.organization;

    const orgIdParts = opts.organization.split("/");
    this.organization = orgIdParts[orgIdParts.length - 1];
  }

  /** Open the OAuth2 authorize dialog with PKCE. */
  async signIn(): Promise<void> {
    // Generate PKCE values
    const { codeVerifier, codeChallenge } = await generatePKCECodes();
    const state = generateRandomString(16);
    // Save in sessionStorage
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);
    sessionStorage.setItem("pkce_state", state);
    // Build URL
    const url = buildAuthorizeUrl(
      this.domain,
      this.clientId,
      this.redirectUri,
      this.email,
      this.scope,
      codeChallenge,
      state,
      this.organization
    );

    console.log("Opening auth dialog", url);

    // Launch Office dialog
    return new Promise<void>((resolve, reject) => {
      Office.context.ui.displayDialogAsync(
        url,
        { height: 60, width: 30, promptBeforeOpen: false },
        (result) => {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            return reject(new Error("Unable to open auth dialog"));
          }
          const dialog = result.value;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, async (args) => {
            try {
              const msg = JSON.parse((args as { message: string }).message);
              const code = msg.code as string;
              const returnedState = msg.state as string;
              const expected = sessionStorage.getItem("pkce_state");
              if (returnedState !== expected || !code) {
                console.error("Invalid state or code", returnedState, expected, code);
                throw new Error("Invalid OAuth2 response");
              }
              const verifier = sessionStorage.getItem("pkce_code_verifier")!;
              const tokenRes = await exchangeCodeForToken(
                this.domain,
                this.clientId,
                code,
                verifier,
                this.redirectUri
              );
              // Store tokens + expiry
              const expiresAt = Date.now() + tokenRes.expires_in * 1000;
              sessionStorage.setItem(
                "pkce_token",
                JSON.stringify({
                  access_token: tokenRes.access_token,
                  refresh_token: tokenRes.refresh_token,
                  expires_at: expiresAt,
                })
              );
              dialog.close();
              resolve();
            } catch (e) {
              dialog.close();
              reject(e);
            }
          });
        }
      );
    });
  }

  /** Retrieve a valid access token, refreshing if needed. */
  async getAccessToken(): Promise<string> {
    const raw = sessionStorage.getItem("pkce_token");

    if (!raw) {
      await this.signIn();
      return await this.getAccessToken();
    }
    const data = JSON.parse(raw) as {
      access_token: string;
      refresh_token?: string;
      expires_at: number;
    };
    // If token expired (with 1min buffer)
    if (Date.now() > data.expires_at - 60000) {
      if (!data.refresh_token) {
        sessionStorage.removeItem("pkce_token");
        return await this.getAccessToken();
      }
      const refreshed = await refreshAccessToken(this.domain, this.clientId, data.refresh_token);
      const newExpiry = Date.now() + refreshed.expires_in * 1000;
      const newData = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || data.refresh_token,
        expires_at: newExpiry,
      };
      sessionStorage.setItem("pkce_token", JSON.stringify(newData));
      return newData.access_token;
    }
    return data.access_token;
  }

  /** Clear stored tokens/PKCE data. */
  async signOut(): Promise<void> {
    sessionStorage.removeItem("pkce_token");
    sessionStorage.removeItem("pkce_state");
    sessionStorage.removeItem("pkce_code_verifier");
  }
}

/** Convenience to register Excel PKCE auth as the shared AuthProvider. */
export function setupExcelPKCEAuth(opts: {
  domain: string;
  clientId: string;
  redirectUri: string;
  email: string;
  scope: string;
  organization: string;
}) {
  const provider = new ExcelPKCEAuthProvider(opts);
  configureAuth(provider);
}
