import { getAccessToken } from './auth';
import { getBaseUrl, fetchFn } from './apiClient';

export interface OrganizationCredits {
    total: number;
    complimentaryActive: number;
}

type Subscriber = (credits: OrganizationCredits | null) => void;
const subscribers = new Set<Subscriber>();

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

function notify(credits: OrganizationCredits | null) {
    subscribers.forEach((cb) => {
        try {
            cb(credits);
        } catch (e) {
            // ignore subscriber errors
            console.warn('[Credits] subscriber error', e);
        }
    });
}

function decodeJwtPayload<T = any>(token: string): T | null {
    try {
        const payload = token.split('.')[1];
        const text =
            typeof atob === 'function'
                ? atob(payload)
                : Buffer.from(payload, 'base64').toString('utf-8');
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

export function subscribeCredits(cb: Subscriber): () => void {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
}

export async function loadOrganizationCredits(): Promise<OrganizationCredits | null> {
    try {
        const token = await getAccessToken();
        if (!token) return null;
        const claims = decodeJwtPayload<{ org_id?: string }>(token);
        const orgId = claims?.org_id;
        if (!orgId) return null;
        const endpoint = `${getBaseUrl()}/v1/credits/organizations/${orgId}`;
        const resp = await fetchFn(endpoint, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            mode: 'cors',
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const total = Number(data.total) || 0;
        const complimentaryActive = Number(data.complimentaryActive) || 0;
        return { total, complimentaryActive };
    } catch (e) {
        console.warn('[Credits] Failed to load organization credits', e);
        return null;
    }
}

async function refreshNow(): Promise<void> {
    if (inFlight) {
        return inFlight;
    }
    inFlight = (async () => {
        const credits = await loadOrganizationCredits();
        notify(credits);
        inFlight = null;
    })();
    return inFlight;
}

export function scheduleCreditsRefresh(delayMs = 10_000): void {
    if (pendingTimer) {
        return; // already scheduled
    }
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        refreshNow().catch((e) =>
            console.warn('[Credits] refresh error after delay', e),
        );
    }, delayMs);
}

// Test helper to reset internal state between tests
export function __resetCreditsSchedulingForTests(): void {
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    inFlight = null;
}

/**
 * Convenience helper to check whether the organization has at least
 * the specified amount of credits (in cents). Useful before starting jobs.
 */
export async function hasSufficientCredits(requiredCents: number): Promise<boolean> {
    const credits = await loadOrganizationCredits();
    if (!credits) return false;
    const available = (credits.complimentaryActive || 0) + (credits.total || 0);
    return available >= requiredCents;
}
