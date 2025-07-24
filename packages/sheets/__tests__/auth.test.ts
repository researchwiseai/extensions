import { configureFetch } from 'pulse-common/api';

// Mock OAuth2 service
const service = {
  hasAccess: () => true,
  getAccessToken: () => 'tok',
  getAuthorizationUrl: () => 'https://auth',
  reset: () => {
    resetCalled = true;
  },
  handleCallback: (_req: any) => true,
  setAuthorizationBaseUrl: () => service,
  setCache: () => service,
  setLock: () => service,
  setTokenUrl: () => service,
  setClientId: () => service,
  setClientSecret: () => service,
  setCallbackFunction: () => service,
  setPropertyStore: () => service,
  setScope: () => service,
  setParam: () => service,
};
let resetCalled = false;

// Mock global services
(global as any).OAuth2 = { createService: () => service };
const userProps: Record<string, string> = {};
(global as any).PropertiesService = {
  getUserProperties: () => ({
    getProperty: (k: string) => userProps[k] || null,
    setProperty: (k: string, v: string) => {
      userProps[k] = v;
    },
    deleteProperty: (k: string) => {
      delete userProps[k];
    },
  }),
  getScriptProperties: () => ({
    getProperty: () => '',
  }),
};
(global as any).CacheService = { getUserCache: () => ({}) };
(global as any).LockService = { getUserLock: () => ({}) };
(global as any).HtmlService = { createHtmlOutput: (s: string) => ({ getContent: () => s }) };

const fetchCalls: any[] = [];
configureFetch(async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ organizationId: 'org-1' }),
    text: async () => '',
  };
});

let findOrganization: typeof import('../src/auth').findOrganization;
let isAuthorized: typeof import('../src/auth').isAuthorized;
let getAuthorizationUrl: typeof import('../src/auth').getAuthorizationUrl;
let disconnect: typeof import('../src/auth').disconnect;

beforeAll(async () => {
  const mod = await import('../src/auth');
  findOrganization = mod.findOrganization;
  isAuthorized = mod.isAuthorized;
  getAuthorizationUrl = mod.getAuthorizationUrl;
  disconnect = mod.disconnect;
});

test('findOrganization stores org info', async () => {
  const res = await findOrganization('user@test.com');
  expect(res.success).toBe(true);
  expect(userProps['USER_EMAIL']).toBe('user@test.com');
  expect(userProps['ORG_ID']).toBe('org-1');
  expect(fetchCalls.length).toBe(1);
});

test('authorization helpers delegate to service', () => {
  expect(isAuthorized()).toBe(true);
  expect(getAuthorizationUrl()).toBe('https://auth');
  disconnect();
  expect(resetCalled).toBe(true);
});
