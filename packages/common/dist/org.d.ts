/**
 * Result of looking up an organization by email.
 */
export interface OrgLookupResult {
    /** True if lookup succeeded and organizationId is present */
    success: boolean;
    /** Organization ID returned by the lookup */
    orgId?: string;
    /** True if the lookup returned 404 (not found) */
    notFound?: boolean;
}
/**
 * Lookup the organization ID for a given email by POSTing to the given URL using the configured fetch function.
 * @param url The users lookup endpoint (e.g., `${WEB_BASE}/users`).
 * @param email The user's email address.
 * @returns OrgLookupResult indicating success, orgId, or notFound.
 */
export declare function findOrganization(url: string, email: string): Promise<OrgLookupResult>;
