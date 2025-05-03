import { ORG_LOOKUP_URL } from "./config";
import { getOAuthService } from "./getOAuthService";

/**
 * Handles the OAuth2 callback.
 * @param {object} request
 * @return {HtmlOutput}
 */
export function authCallback(request: object): GoogleAppsScript.HTML.HtmlOutput {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput(
      'Success! You may close this dialog.'
    );
  } else {
    return HtmlService.createHtmlOutput(
      'Denied. You may close this dialog.'
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
export function disconnect(): { success: boolean; } {
    const props = PropertiesService.getUserProperties();
    try {
        getOAuthService().reset();
    } catch {
        console.warn('Error resetting OAuth service');
    }
    props.deleteProperty('USER_EMAIL');
    props.deleteProperty('ORG_ID');
    return { success: true };
}
/**
 * Finds the organization ID by email and persists it.
 * @param {string} email
 * @return {{success: boolean, orgId?: string, notFound?: boolean}}
 */
export function findOrganization(email: string): { success: boolean; orgId?: string; notFound?: boolean; } {
    const props = PropertiesService.getUserProperties();
    // Unauthenticated lookup: POST email to /users endpoint
    const url = ORG_LOOKUP_URL;
    const options = {
        method: 'post' as const,
        contentType: 'application/json',
        payload: JSON.stringify({ email: email }),
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());
        if (data.organizationId) {
            props.setProperty('USER_EMAIL', email);
            props.setProperty('ORG_ID', data.organizationId);
            return { success: true, orgId: data.organizationId };
        } else {
            return { success: false };
        }
    } catch (e) {
        if (e.toString().indexOf('returned code 404') !== -1) {
            return { success: false, notFound: true };
        }
        throw new Error('Error finding organization: ' + e);
    }
}