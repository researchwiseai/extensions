// Auth guard utilities for protected flows

import { ensurePulseAuthConfigured } from './pulseAuth';

export function isAuthed(): boolean {
    const token = sessionStorage.getItem('pkce_token');
    const email = sessionStorage.getItem('user-email');
    const orgId = sessionStorage.getItem('org-id');
    return !!(token && email && orgId);
}

/**
 * Open a lightweight auth helper dialog that either auto-closes if already authed
 * or asks for the user's email to start sign-in.
 * Resolves when authentication is complete or rejects on explicit cancel.
 */
// No longer using a modal auth dialog: auth now occurs in the Taskpane

/** Ensure user is authenticated, opening a dialog if needed. */
export async function ensureAuthed(): Promise<boolean> {
    if (isAuthed()) return true;
    try {
        await Office.addin.showAsTaskpane();
    } catch (e) {
        // ignore, try polling anyway
    }
    // Poll for up to 10 minutes for auth to complete in Taskpane
    const timeoutAt = Date.now() + 10 * 60 * 1000;
    while (Date.now() < timeoutAt) {
        if (isAuthed()) return true;
        await new Promise((r) => setTimeout(r, 1500));
    }
    return isAuthed();
}

/** Wrap a flow so it only runs once authentication is ensured. */
export async function withPulseAuth<T>(
    fn: () => Promise<T>,
): Promise<T | undefined> {
    const ok = await ensureAuthed();
    if (!ok) return undefined;
    if (!ensurePulseAuthConfigured()) return undefined;
    return fn();
}
