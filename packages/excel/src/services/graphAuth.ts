export async function isGraphAuthenticated(): Promise<boolean> {
    try {
        // Try to get Graph token without prompting
        const token = await OfficeRuntime.auth.getAccessToken({
            allowSignInPrompt: false,
            forMSGraphAccess: true,
        });
        if (token && token.length > 0) {
            sessionStorage.setItem('graph-auth', '1');
            return true;
        }
    } catch {}
    sessionStorage.removeItem('graph-auth');
    return false;
}

export async function signInGraph(): Promise<boolean> {
    try {
        const token = await OfficeRuntime.auth.getAccessToken({
            allowSignInPrompt: true,
            forMSGraphAccess: true,
        });
        if (token && token.length > 0) {
            sessionStorage.setItem('graph-auth', '1');
            return true;
        }
    } catch (e) {
        const msg = (e as any)?.message || String(e);
        console.warn('Graph sign-in failed', e);
        if (msg && /identity api.+not supported/i.test(msg)) {
            console.warn(
                'Office Identity API is unavailable for this add-in. Ensure the manifest includes WebApplicationInfo and the add-in is configured for SSO.'
            );
        }
    }
    return false;
}

export function disconnectGraph(): void {
    // There's no explicit OfficeRuntime sign-out; clear our local flag.
    sessionStorage.removeItem('graph-auth');
}
