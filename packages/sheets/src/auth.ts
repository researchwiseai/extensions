import { ORG_LOOKUP_URL } from './config';
import { getOAuthService } from './getOAuthService';
import {
    AuthProvider,
    configureAuth,
    getAccessToken,
    signOut as commonSignOut,
} from 'pulse-common/auth';
import { findOrganization, OrgLookupResult } from 'pulse-common/org';

// Thin Apps Script implementation of the AuthProvider interface
class AppsScriptAuthProvider implements AuthProvider {
    async signIn(): Promise<void> {
        // No-op; interactive sign-in handled on client via getAuthorizationUrl
    }
    async signOut(): Promise<void> {
        getOAuthService().reset();
    }
    async getAccessToken(): Promise<string> {
        const service = getOAuthService();
        if (!service.hasAccess()) {
            throw new Error('Not authorized');
        }
        return service.getAccessToken();
    }
}

// Register the provider for common auth utilities
configureAuth(new AppsScriptAuthProvider());

/**
 * Handles the OAuth2 callback.
 * @param {object} request
 * @return {HtmlOutput}
 */
export function authCallback(
    request: object,
): GoogleAppsScript.HTML.HtmlOutput {
    const service = getOAuthService();
    const authorized = service.handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput(
            'Success! You may close this dialog.',
        );
    } else {
        return HtmlService.createHtmlOutput(
            'Denied. You may close this dialog.',
        );
    }
}

/**
 * Returns the OAuth2 authorization URL.
 * @return {string}
 */
export function getAuthorizationUrl(): string {
    return getOAuthService().getAuthorizationUrl();
}

/**
 * Checks if the OAuth2 service has access.
 * @return {boolean}
 */
export function isAuthorized(): boolean {
    return getOAuthService().hasAccess();
}
/**
 * Disconnects the user by clearing stored credentials.
 * @return {{success: boolean}}
 */
export function disconnect(): { success: boolean } {
    const props = PropertiesService.getUserProperties();
    try {
        commonSignOut();
    } catch (e) {
        console.warn('Error resetting OAuth service');
    }
    props.deleteProperty('USER_EMAIL');
    props.deleteProperty('ORG_ID');
    return { success: true };
}
/**
 * Finds the organization ID by email and persists it.
 * Delegates to shared implementation.
 * @param email The user's email address.
 * @returns OrgLookupResult indicating success, orgId, or notFound.
 */
export async function findOrganizationForSheets(
    email: string,
): Promise<OrgLookupResult> {
    const props = PropertiesService.getUserProperties();
    const result = await findOrganization(ORG_LOOKUP_URL, email);
    if (result.success && result.orgId) {
        props.setProperty('USER_EMAIL', email);
        props.setProperty('ORG_ID', result.orgId);
    }
    return result;
}

// Re-export token retrieval for consumers
export { getAccessToken };
