/* global Office, sessionStorage */
import { AuthProvider, configureAuth } from 'pulse-common/auth';

import {
    buildAuthorizeUrl,
    exchangeCodeForToken,
    generatePKCECodes,
    generateRandomString,
    refreshAccessToken,
} from 'pulse-common/pkce';

import {
    logOfficeError,
    logAuthError,
    logError,
    logSuccess,
} from '../services/sentry';

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

        const orgIdParts = opts.organization.split('/');
        this.organization = orgIdParts[orgIdParts.length - 1];
    }

    /** Open the OAuth2 authorize dialog with PKCE. */
    async signIn(): Promise<void> {
        try {
            // Generate PKCE values
            const { codeVerifier, codeChallenge } = await generatePKCECodes();
            const state = generateRandomString(16);

            // Save in sessionStorage
            sessionStorage.setItem('pkce_code_verifier', codeVerifier);
            sessionStorage.setItem('pkce_state', state);

            // Build URL
            const url = buildAuthorizeUrl(
                this.domain,
                this.clientId,
                this.redirectUri,
                this.email,
                this.scope,
                codeChallenge,
                state,
                this.organization,
            );

            logSuccess('signIn:pkce_setup', {
                domain: this.domain,
                clientId: this.clientId,
                email: this.email,
                organization: this.organization,
                redirectUri: this.redirectUri,
            });

            // Launch Office dialog
            return new Promise<void>((resolve, reject) => {
                Office.context.ui.displayDialogAsync(
                    url,
                    { height: 60, width: 30, promptBeforeOpen: false },
                    (result) => {
                        if (
                            result.status !== Office.AsyncResultStatus.Succeeded
                        ) {
                            logOfficeError(
                                'signIn:displayDialog',
                                result.error,
                                {
                                    url,
                                    dialogOptions: {
                                        height: 60,
                                        width: 30,
                                        promptBeforeOpen: false,
                                    },
                                    officeStatus: result.status,
                                },
                            );
                            return reject(
                                new Error('Unable to open auth dialog'),
                            );
                        }

                        logSuccess('signIn:dialog_opened', {
                            dialogId: result.value?.dialogId,
                        });

                        const dialog = result.value;
                        dialog.addEventHandler(
                            Office.EventType.DialogMessageReceived,
                            async (args) => {
                                try {
                                    logSuccess(
                                        'signIn:dialog_message_received',
                                        {
                                            messageLength: (
                                                args as { message: string }
                                            ).message?.length,
                                        },
                                    );

                                    const msg = JSON.parse(
                                        (args as { message: string }).message,
                                    );

                                    if (msg.error) {
                                        logAuthError(
                                            'signIn:auth_callback_error',
                                            msg,
                                            {
                                                errorCode: msg.error,
                                                errorDescription:
                                                    msg.error_description,
                                                state: msg.state,
                                            },
                                        );
                                        throw new Error(
                                            msg.error_description || msg.error,
                                        );
                                    }

                                    const code = msg.code as string;
                                    const returnedState = msg.state as string;
                                    const expected =
                                        sessionStorage.getItem('pkce_state');

                                    if (returnedState !== expected || !code) {
                                        logAuthError(
                                            'signIn:invalid_oauth_response',
                                            new Error(
                                                'Invalid OAuth2 response',
                                            ),
                                            {
                                                returnedState,
                                                expectedState: expected,
                                                stateMatches:
                                                    returnedState === expected,
                                                hasCode: Boolean(code),
                                                codeLength: code?.length,
                                            },
                                        );
                                        throw new Error(
                                            'Invalid OAuth2 response',
                                        );
                                    }

                                    logSuccess(
                                        'signIn:oauth_validation_passed',
                                        {
                                            hasCode: Boolean(code),
                                            stateMatches:
                                                returnedState === expected,
                                        },
                                    );

                                    const verifier =
                                        sessionStorage.getItem(
                                            'pkce_code_verifier',
                                        )!;

                                    try {
                                        const tokenRes =
                                            await exchangeCodeForToken(
                                                this.domain,
                                                this.clientId,
                                                code,
                                                verifier,
                                                this.redirectUri,
                                            );

                                        logSuccess(
                                            'signIn:token_exchange_success',
                                            {
                                                hasAccessToken: Boolean(
                                                    tokenRes.access_token,
                                                ),
                                                hasRefreshToken: Boolean(
                                                    tokenRes.refresh_token,
                                                ),
                                                expiresIn: tokenRes.expires_in,
                                            },
                                        );

                                        // Store tokens + expiry
                                        const expiresAt =
                                            Date.now() +
                                            tokenRes.expires_in * 1000;
                                        sessionStorage.setItem(
                                            'pkce_token',
                                            JSON.stringify({
                                                access_token:
                                                    tokenRes.access_token,
                                                refresh_token:
                                                    tokenRes.refresh_token,
                                                expires_at: expiresAt,
                                            }),
                                        );

                                        dialog.close();
                                        logSuccess('signIn:complete');
                                        resolve();
                                    } catch (tokenError) {
                                        logAuthError(
                                            'signIn:token_exchange_failed',
                                            tokenError,
                                            {
                                                domain: this.domain,
                                                clientId: this.clientId,
                                                hasCode: Boolean(code),
                                                hasVerifier: Boolean(verifier),
                                            },
                                        );
                                        throw tokenError;
                                    }
                                } catch (e) {
                                    logAuthError(
                                        'signIn:dialog_handler_error',
                                        e,
                                        {
                                            messageReceived: Boolean(
                                                (args as { message: string })
                                                    .message,
                                            ),
                                        },
                                    );
                                    dialog.close();
                                    reject(e);
                                }
                            },
                        );

                        // Add error handler for dialog events
                        dialog.addEventHandler(
                            Office.EventType.DialogEventReceived,
                            (args) => {
                                logOfficeError(
                                    'signIn:dialog_event_error',
                                    args,
                                    {
                                        eventType: args?.type,
                                        eventMessage: args?.message,
                                    },
                                );
                                dialog.close();
                                reject(
                                    new Error(
                                        `Dialog error: ${args?.message || 'Unknown dialog error'}`,
                                    ),
                                );
                            },
                        );
                    },
                );
            });
        } catch (error) {
            logError('signIn:general_error', error, {
                domain: this.domain,
                email: this.email,
                organization: this.organization,
            });
            throw error;
        }
    }

    /** Retrieve a valid access token, refreshing if needed. */
    async getAccessToken(): Promise<string> {
        try {
            const raw = sessionStorage.getItem('pkce_token');

            if (!raw) {
                logSuccess('getAccessToken:no_token_found', {
                    action: 'triggering_signin',
                });
                await this.signIn();
                return await this.getAccessToken();
            }

            const data = JSON.parse(raw) as {
                access_token: string;
                refresh_token?: string;
                expires_at: number;
            };

            const now = Date.now();
            const expiresAt = data.expires_at;
            const timeUntilExpiry = expiresAt - now;
            const isExpired = now > expiresAt - 60000; // 1min buffer

            logSuccess('getAccessToken:token_check', {
                hasAccessToken: Boolean(data.access_token),
                hasRefreshToken: Boolean(data.refresh_token),
                timeUntilExpiry,
                isExpired,
            });

            // If token expired (with 1min buffer)
            if (isExpired) {
                if (!data.refresh_token) {
                    logSuccess('getAccessToken:no_refresh_token', {
                        action: 'clearing_token_and_signin',
                    });
                    sessionStorage.removeItem('pkce_token');
                    return await this.getAccessToken();
                }

                try {
                    logSuccess('getAccessToken:refreshing_token', {
                        domain: this.domain,
                        clientId: this.clientId,
                    });

                    const refreshed = await refreshAccessToken(
                        this.domain,
                        this.clientId,
                        data.refresh_token,
                    );

                    logSuccess('getAccessToken:token_refresh_success', {
                        hasNewAccessToken: Boolean(refreshed.access_token),
                        hasNewRefreshToken: Boolean(refreshed.refresh_token),
                        newExpiresIn: refreshed.expires_in,
                    });

                    const newExpiry = Date.now() + refreshed.expires_in * 1000;
                    const newData = {
                        access_token: refreshed.access_token,
                        refresh_token:
                            refreshed.refresh_token || data.refresh_token,
                        expires_at: newExpiry,
                    };
                    sessionStorage.setItem(
                        'pkce_token',
                        JSON.stringify(newData),
                    );
                    return newData.access_token;
                } catch (refreshError) {
                    logAuthError(
                        'getAccessToken:token_refresh_failed',
                        refreshError,
                        {
                            domain: this.domain,
                            clientId: this.clientId,
                            hasRefreshToken: Boolean(data.refresh_token),
                        },
                    );
                    // Clear invalid tokens and retry
                    sessionStorage.removeItem('pkce_token');
                    return await this.getAccessToken();
                }
            }

            logSuccess('getAccessToken:returning_valid_token', {
                timeUntilExpiry,
            });
            return data.access_token;
        } catch (error) {
            logError('getAccessToken:general_error', error, {
                domain: this.domain,
                email: this.email,
            });
            throw error;
        }
    }

    /** Clear stored tokens/PKCE data. */
    async signOut(): Promise<void> {
        sessionStorage.removeItem('pkce_token');
        sessionStorage.removeItem('pkce_state');
        sessionStorage.removeItem('pkce_code_verifier');
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
