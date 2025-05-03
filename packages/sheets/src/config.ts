// Script properties for API and authentication configuration
export const SCRIPT_PROPS = PropertiesService.getScriptProperties();
// Base URL for API endpoints (from script property), e.g. "https://dev.core.researchwiseai.com"
export const API_BASE = SCRIPT_PROPS.getProperty('API_BASE') + '/pulse/v1';
// Web base URL (used for organization registration link), e.g. "https://dev.researchwiseai.com"
export const WEB_BASE = SCRIPT_PROPS.getProperty('WEB_BASE');
// OAuth2 domain, e.g. "wise-dev.eu.auth0.com"
export const AUTH_DOMAIN = SCRIPT_PROPS.getProperty('AUTH_DOMAIN');
// OAuth2 audience (API identifier), e.g. Auth0 API_AUD
export const API_AUD = SCRIPT_PROPS.getProperty('API_AUD');
// Organization lookup endpoint (lookup by email via unauthenticated POST to /users)
export const ORG_LOOKUP_URL = `${WEB_BASE}/users`;