import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { configureClient, configureFetch } from '../src/apiClient.js';
import { configureAuth, AuthProvider } from '../src/auth.js';
import {
  loadOrganizationCredits,
  subscribeCredits,
  scheduleCreditsRefresh,
  hasSufficientCredits,
  __resetCreditsSchedulingForTests,
} from '../src/credits.js';

class DummyAuth implements AuthProvider {
  constructor(private token: string) {}
  async signIn(): Promise<void> {}
  async signOut(): Promise<void> {}
  async getAccessToken(): Promise<string> { return this.token; }
}

function makeJwtWithOrg(orgId: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ org_id: orgId })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('credits utilities', () => {
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    configureClient({ baseUrl, getAccessToken: async () => '' });
    __resetCreditsSchedulingForTests();
  });

  afterEach(() => {
    // restore default fetch
    configureFetch((globalThis.fetch as any) ?? (async () => ({ ok: true })) as any);
  });

  it('loads organization credits using token org_id', async () => {
    const token = makeJwtWithOrg('org-123');
    configureAuth(new DummyAuth(token));

    const mockFetch = mock(async (url: string) => {
      expect(url).toBe(`${baseUrl}/v1/credits/organizations/org-123`);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ total: 2500, complimentaryActive: 500 }),
        text: async () => ''
      } as any;
    });
    configureFetch(mockFetch as any);

    const credits = await loadOrganizationCredits();
    expect(credits).toEqual({ total: 2500, complimentaryActive: 500 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('subscribes and receives debounced refresh', async () => {
    const token = makeJwtWithOrg('org-xyz');
    configureAuth(new DummyAuth(token));

    let calls = 0;
    configureFetch(async () => {
      calls++;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ total: 1000, complimentaryActive: 0 }),
        text: async () => ''
      } as any;
    });

    const received: any[] = [];
    const unsub = subscribeCredits((c) => { received.push(c); });

    // schedule twice quickly; should debounce into a single fetch
    scheduleCreditsRefresh(200);
    scheduleCreditsRefresh(200);

    await new Promise((r) => setTimeout(r, 600));

    expect(calls).toBe(1);
    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ total: 1000, complimentaryActive: 0 });
    unsub();
  });

  it('hasSufficientCredits returns correct boolean', async () => {
    const token = makeJwtWithOrg('org-bool');
    configureAuth(new DummyAuth(token));
    configureFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ total: 1200, complimentaryActive: 300 }),
      text: async () => ''
    }) as any);

    await expect(hasSufficientCredits(100)).resolves.toBe(true);
    await expect(hasSufficientCredits(2000)).resolves.toBe(false);
  });
});
