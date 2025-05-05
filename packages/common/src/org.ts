import { fetchFn } from "./apiClient";

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
export async function findOrganization(url: string, email: string): Promise<OrgLookupResult> {
  const options = {
    method: 'post' as const,
    contentType: 'application/json' as const,
    body: JSON.stringify({ email }),
  };
  try {
    const response = await fetchFn(url, options);
    const data = await response.json();
    if (data.organizationId) {
      return { success: true, orgId: data.organizationId };
    }
    return { success: false };
  } catch (e: any) {
    // If endpoint returns 404, treat as not found
    const msg = e && e.toString ? e.toString() : '';
    if (msg.includes('returned code 404')) {
      return { success: false, notFound: true };
    }
    throw new Error('Error finding organization: ' + e);
  }
}