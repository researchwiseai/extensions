"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrganization = findOrganization;
const apiClient_1 = require("./apiClient");
/**
 * Lookup the organization ID for a given email by POSTing to the given URL using the configured fetch function.
 * @param url The users lookup endpoint (e.g., `${WEB_BASE}/users`).
 * @param email The user's email address.
 * @returns OrgLookupResult indicating success, orgId, or notFound.
 */
async function findOrganization(url, email) {
    const options = {
        method: 'post',
        contentType: 'application/json',
        body: JSON.stringify({ email }),
    };
    try {
        const response = await (0, apiClient_1.fetchFn)(url, options);
        const data = await response.json();
        if (data.organizationId) {
            return { success: true, orgId: data.organizationId };
        }
        return { success: false };
    }
    catch (e) {
        // If endpoint returns 404, treat as not found
        const msg = e && e.toString ? e.toString() : '';
        if (msg.includes('returned code 404')) {
            return { success: false, notFound: true };
        }
        throw new Error('Error finding organization: ' + e);
    }
}
