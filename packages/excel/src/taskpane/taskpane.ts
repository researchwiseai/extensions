/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global console, document, Excel, Office */
import { setupExcelPKCEAuth } from './pkceAuth';
import { signIn, getAccessToken, signOut } from 'pulse-common/auth';
import { findOrganization } from 'pulse-common/org';
import { configureClient } from 'pulse-common/api';
import { analyzeSentiment } from '../analyzeSentiment';
import { allocateThemesAutomaticFlow } from '../flows/allocateThemesAutomatic';
import { themeGenerationFlow } from '../flows/themeGenerationFlow';

/**
 * Prompts the user to confirm or change the range via a dialog.
 * @param defaultRange The default A1 range including sheet name (e.g., 'Sheet1!A1:B5').
 * @returns The confirmed range string, or null if cancelled.
 */
function promptRange(defaultRange: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const url = `${window.location.origin}/SelectRangeDialog.html?range=${encodeURIComponent(defaultRange)}`;
        Office.context.ui.displayDialogAsync(
            url,
            { height: 30, width: 20, displayInIframe: true },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(result.error);
                } else {
                    const dialog = result.value;
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        (arg) => {
                            try {
                                const msg = JSON.parse(arg.message);
                                dialog.close();
                                resolve(msg.range);
                            } catch (e) {
                                dialog.close();
                                reject(e);
                            }
                        },
                    );
                }
            },
        );
    });
}

// The initialize function must be run each time a new page is loaded
Office.onReady(() => {
    const sideloadEl = document.getElementById('sideload-msg');
    const loginEl = document.getElementById('app-body');
    const authEl = document.getElementById('authenticated-app');
    if (sideloadEl) {
        sideloadEl.style.display = 'none';
    }
    // Determine login state from sessionStorage
    const storedToken = sessionStorage.getItem('pkce_token');
    const storedEmail = sessionStorage.getItem('user-email');
    const organization = sessionStorage.getItem('org-id');
    const redirectUri = `${window.location.origin}/auth-callback.html`;
    if (storedToken && storedEmail && loginEl && authEl && organization) {
        // Already authenticated: configure and show authenticated view
        setupExcelPKCEAuth({
            domain: 'research-wise-ai-eu.eu.auth0.com',
            clientId: 'kcQuNXgTeKSzztl8kGm5zwJ0RQeX7w1O',
            email: storedEmail,
            redirectUri,
            organization,
            scope: 'openid profile email offline_access',
        });
        configureClient({
            baseUrl: 'https://core.researchwiseai.com',
            getAccessToken,
        });
        initializeAuthenticatedUI(storedEmail);
    } else if (loginEl && authEl) {
        // Not authenticated: show login and bind connect
        loginEl.style.display = 'flex';
        authEl.style.display = 'none';
        const connectButton = document.getElementById('connect');
        if (connectButton) {
            connectButton.onclick = connect;
        }
    }
});

export async function run() {
    try {
        await Excel.run(async (context) => {
            /**
             * Insert your Excel code here
             */
            const range = context.workbook.getSelectedRange();

            // Read the range address
            range.load('address');

            // Update the fill color
            range.format.fill.color = 'yellow';

            await context.sync();
            console.log(`The range address was ${range.address}.`);
        });
    } catch (error) {
        console.error(error);
    }
}

// --- Authenticated UI and Job Manager ---
interface Job {
    id: string;
    name: string;
    element: HTMLElement;
}
const jobs: Job[] = [];

/** Add a new job entry to the running jobs list */
function addJob(name: string): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const li = document.createElement('li');
    li.id = id;
    li.className = 'ms-ListItem';
    li.textContent = `${name}: Running...`;
    const list = document.getElementById('jobs-list');
    if (list) {
        list.appendChild(li);
    }
    jobs.push({ id, name, element: li });
    return id;
}

/** Remove a job entry from the running jobs list */
function removeJob(id: string): void {
    const index = jobs.findIndex((j) => j.id === id);
    if (index >= 0) {
        const [job] = jobs.splice(index, 1);
        job.element.remove();
    }
}

/** Initialize the authenticated UI: show menu, bind handlers, and hide login */
function initializeAuthenticatedUI(email: string): void {
    const loginEl = document.getElementById('app-body');
    const authEl = document.getElementById('authenticated-app');
    if (loginEl && authEl) {
        loginEl.style.display = 'none';
        authEl.style.display = 'flex';
    }
    const emailDisplay = document.getElementById('user-email-display');
    if (emailDisplay) {
        emailDisplay.textContent = email;
    }
    // Logout handler
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        // Show logout in header
        (logoutBtn as HTMLElement).style.display = 'inline-block';
        logoutBtn.onclick = async () => {
            // Hide logout button
            (logoutBtn as HTMLElement).style.display = 'none';
            await signOut();
            // Clear stored email
            sessionStorage.removeItem('user-email');
            sessionStorage.removeItem('pkce_token');
            sessionStorage.removeItem('org-id');
            // Reset UI
            if (authEl && loginEl) {
                authEl.style.display = 'none';
                loginEl.style.display = 'flex';
            }
            // Clear jobs
            jobs.slice().forEach((j) => removeJob(j.id));
            // Clear email input
            const emailInput = document.getElementById(
                'email-input',
            ) as HTMLInputElement;
            if (emailInput) {
                emailInput.value = '';
            }
        };
    }
    // Analyze Sentiment: confirm range via dialog, then run analysis
    const analyzeSentimentBtn = document.getElementById(
        'menu-analyze-sentiment',
    );
    if (analyzeSentimentBtn) {
        analyzeSentimentBtn.onclick = () => {
            const jobId = addJob('Analyze Sentiment');
            Excel.run(async (context) => {
                const sel = context.workbook.getSelectedRange();
                sel.load('address');
                await context.sync();
                const defaultAddr: string = sel.address;
                let confirmed: string | null;
                try {
                    confirmed = await promptRange(defaultAddr);
                } catch (e) {
                    console.error('Dialog error', e);
                    removeJob(jobId);
                    return;
                }
                if (!confirmed) {
                    removeJob(jobId);
                    return;
                }

                await analyzeSentiment(context, confirmed);
                removeJob(jobId);
            }).catch((err) => {
                console.error(err);
                removeJob(jobId);
            });
        };
    }

    // Allocate Themes: confirm range via dialog, then run analysis
    const allocateThemesBtn = document.getElementById('menu-allocate-themes');
    if (allocateThemesBtn) {
        allocateThemesBtn.onclick = () => {
            const jobId = addJob('Allocating Themes');
            Excel.run(async (context) => {
                const sel = context.workbook.getSelectedRange();
                sel.load('address');
                await context.sync();
                const defaultAddr: string = sel.address;
                let confirmed: string | null;
                try {
                    confirmed = await promptRange(defaultAddr);
                } catch (e) {
                    console.error('Dialog error', e);
                    removeJob(jobId);
                    return;
                }
                if (!confirmed) {
                    removeJob(jobId);
                    return;
                }

                await allocateThemesAutomaticFlow(context, confirmed);
                removeJob(jobId);
            }).catch((err) => {
                console.error(err);
                removeJob(jobId);
            });
        };
    }

    // Allocate Themes: confirm range via dialog, then run analysis
    const generateThemesBtn = document.getElementById('menu-generate-themes');
    if (generateThemesBtn) {
        generateThemesBtn.onclick = () => {
            const jobId = addJob('Generating Themes');
            Excel.run(async (context) => {
                const sel = context.workbook.getSelectedRange();
                sel.load('address');
                await context.sync();
                const defaultAddr: string = sel.address;
                let confirmed: string | null;
                try {
                    confirmed = await promptRange(defaultAddr);
                } catch (e) {
                    console.error('Dialog error', e);
                    removeJob(jobId);
                    return;
                }
                if (!confirmed) {
                    removeJob(jobId);
                    return;
                }

                await themeGenerationFlow(context, confirmed);
                removeJob(jobId);
            }).catch((err) => {
                console.error(err);
                removeJob(jobId);
            });
        };
    }
}
/**
 * Handles user sign-in and API client configuration using PKCE.
 */
export async function connect() {
    // Update Connect button to indicate ongoing connection
    const connectBtn = document.getElementById(
        'connect',
    ) as HTMLButtonElement | null;
    let connectBtnLabel: HTMLElement | null = null;
    let originalBtnText: string | null = null;
    if (connectBtn) {
        connectBtnLabel = connectBtn.querySelector('.ms-Button-label');
        originalBtnText =
            connectBtnLabel?.textContent || connectBtn.textContent;
        connectBtn.disabled = true;
        if (connectBtnLabel) {
            connectBtnLabel.textContent = 'Connecting...';
        } else {
            connectBtn.textContent = 'Connecting...';
        }
    }
    try {
        const domain = 'research-wise-ai-eu.eu.auth0.com';
        const clientId = 'kcQuNXgTeKSzztl8kGm5zwJ0RQeX7w1O';

        // Redirect URI must match your Auth0 app and maps to auth-callback.html
        const redirectUri = `${window.location.origin}/auth-callback.html`;
        const scope = 'openid profile email offline_access';
        const apiBase = 'https://core.researchwiseai.com';

        const email = (
            document.getElementById('email-input') as HTMLInputElement
        ).value;
        // Persist user email for session
        sessionStorage.setItem('user-email', email);

        // Lookup the user's organization ID before authentication using shared common code
        const webBase = 'https://researchwiseai.com';
        const orgLookupUrl = `${webBase}/users`;
        const orgResult = await findOrganization(orgLookupUrl, email);
        if (!orgResult.success) {
            if (orgResult.notFound) {
                window.alert(`No organization found for ${email}.`);
                // Restore Connect button state on early exit
                if (connectBtn) {
                    connectBtn.disabled = false;
                    if (connectBtnLabel && originalBtnText !== null) {
                        connectBtnLabel.textContent = originalBtnText;
                    } else if (originalBtnText !== null) {
                        connectBtn.textContent = originalBtnText;
                    }
                }
                return;
            }
            throw new Error(`Error finding organization`);
        }
        const organization = orgResult.orgId!;

        // Configure the PKCE AuthProvider with the user's organization
        setupExcelPKCEAuth({
            domain,
            clientId,
            email,
            redirectUri,
            scope,
            organization,
        });
        // Save the organization ID in sessionStorage
        sessionStorage.setItem('org-id', organization);
        // Perform interactive sign-in
        await signIn();

        // Initialize the Pulse API client
        configureClient({ baseUrl: apiBase, getAccessToken });

        console.log('✅ Connected and authenticated');
        // Switch to authenticated UI
        initializeAuthenticatedUI(email);
    } catch (err) {
        console.error('Authentication failed', err);
        // Restore Connect button state on failure
        if (connectBtn) {
            connectBtn.disabled = false;
            if (connectBtnLabel && originalBtnText !== null) {
                connectBtnLabel.textContent = originalBtnText;
            } else if (originalBtnText !== null) {
                connectBtn.textContent = originalBtnText;
            }
        }
    }
}
