/// <reference types="google-apps-script-oauth2" />

/**
 * Configures and returns the OAuth2 service.
 * @return {OAuth2.Service}
 */

import { API_AUD, AUTH_DOMAIN, SCRIPT_PROPS } from './config';

export function getOAuthService(): GoogleAppsScriptOAuth2.OAuth2Service {
    const props = PropertiesService.getUserProperties();
    const orgId = props.getProperty('ORG_ID');
    if (!orgId) {
        return {
            hasAccess: () => false,
        } as GoogleAppsScriptOAuth2.OAuth2Service;
    }
    const email = props.getProperty('USER_EMAIL');
    const auth0OrgId = orgId.split('/').pop();
    // Configure OAuth2 service using script properties
    const service = OAuth2.createService('ResearchWiseAI')
        .setAuthorizationBaseUrl(`https://${AUTH_DOMAIN}/authorize`)
        .setCache(CacheService.getUserCache())
        .setLock(LockService.getUserLock())
        .setTokenUrl(`https://${AUTH_DOMAIN}/oauth/token`)
        .setClientId(SCRIPT_PROPS.getProperty('CLIENT_ID'))
        .setClientSecret(SCRIPT_PROPS.getProperty('CLIENT_SECRET'))
        .setCallbackFunction('authCallback')
        .setPropertyStore(props)
        .setScope('openid profile email offline_access')
        .setParam('audience', API_AUD)
        .setParam('organization', auth0OrgId || '')
        .setParam('prompt', 'consent');

    if (email) {
        service.setParam('login_hint', email);
    }
    return service;
}
