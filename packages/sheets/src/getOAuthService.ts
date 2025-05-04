/// <reference types="google-apps-script-oauth2" />

/**
 * Configures and returns the OAuth2 service.
 * @return {OAuth2.Service}
 */

import { API_AUD, AUTH_DOMAIN, SCRIPT_PROPS } from './config';

export function getOAuthService(): GoogleAppsScriptOAuth2.OAuth2Service {
    const orgId = PropertiesService.getUserProperties().getProperty('ORG_ID');

    if (!orgId) {
        return {
            hasAccess: () => false,
        } as GoogleAppsScriptOAuth2.OAuth2Service;
    }

    const orgIdParts = orgId.split('/');
    const auth0OrgId = orgIdParts[orgIdParts.length - 1];

    // Configure OAuth2 service using script properties
    return OAuth2.createService('ResearchWiseAI')
        .setAuthorizationBaseUrl(`https://${AUTH_DOMAIN}/authorize`)
        .setCache(CacheService.getUserCache())
        .setLock(LockService.getUserLock())
        .setTokenUrl(`https://${AUTH_DOMAIN}/oauth/token`)
        .setClientId(SCRIPT_PROPS.getProperty('CLIENT_ID'))
        .setClientSecret(SCRIPT_PROPS.getProperty('CLIENT_SECRET'))
        .setCallbackFunction('authCallback')
        .setPropertyStore(PropertiesService.getUserProperties())
        .setScope('openid profile email offline_access')
        .setParam('audience', API_AUD)
        .setParam('organization', auth0OrgId)
        .setParam('prompt', 'consent')
        .setParam(
            'login_hint',
            PropertiesService.getUserProperties().getProperty('USER_EMAIL'),
        );
}
