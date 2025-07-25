import { jest } from '@jest/globals';

const service: any = {
  setAuthorizationBaseUrl: jest.fn().mockReturnThis(),
  setCache: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  setTokenUrl: jest.fn().mockReturnThis(),
  setClientId: jest.fn().mockReturnThis(),
  setClientSecret: jest.fn().mockReturnThis(),
  setCallbackFunction: jest.fn().mockReturnThis(),
  setPropertyStore: jest.fn().mockReturnThis(),
  setScope: jest.fn().mockReturnThis(),
  setParam: jest.fn().mockReturnThis(),
  hasAccess: jest.fn(() => true),
};

const createServiceMock = jest.fn(() => service);
(global as any).OAuth2 = { createService: createServiceMock };
(global as any).CacheService = { getUserCache: jest.fn(() => ({})) };
(global as any).LockService = { getUserLock: jest.fn(() => ({})) };

const userProps: Record<string, string> = {};
const scriptProps: Record<string, string> = {
  CLIENT_ID: 'cid',
  CLIENT_SECRET: 'secret',
  AUTH_DOMAIN: 'auth.example.com',
  API_AUD: 'aud',
};

(global as any).PropertiesService = {
  getUserProperties: () => ({
    getProperty: (k: string) => userProps[k] || null,
    setProperty: (k: string, v: string) => { userProps[k] = v; },
    deleteProperty: (k: string) => { delete userProps[k]; },
  }),
  getScriptProperties: () => ({
    getProperty: (k: string) => scriptProps[k] || null,
  }),
};

let getOAuthService: typeof import('../src/getOAuthService').getOAuthService;

beforeAll(async () => {
  getOAuthService = (await import('../src/getOAuthService')).getOAuthService;
});

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(userProps)) {
    delete userProps[key];
  }
});

test('returns service with hasAccess false when ORG_ID missing', () => {
  const svc = getOAuthService();
  expect(createServiceMock).not.toHaveBeenCalled();
  expect(svc.hasAccess()).toBe(false);
});

test('creates OAuth service with properties and login_hint', () => {
  userProps['ORG_ID'] = 'auth0/org-1';
  userProps['USER_EMAIL'] = 'user@test.com';

  const svc = getOAuthService();
  expect(createServiceMock).toHaveBeenCalledWith('ResearchWiseAI');
  expect(service.setAuthorizationBaseUrl).toHaveBeenCalledWith('https://'+scriptProps.AUTH_DOMAIN+'/authorize');
  expect(service.setTokenUrl).toHaveBeenCalledWith('https://'+scriptProps.AUTH_DOMAIN+'/oauth/token');
  expect(service.setClientId).toHaveBeenCalledWith(scriptProps.CLIENT_ID);
  expect(service.setClientSecret).toHaveBeenCalledWith(scriptProps.CLIENT_SECRET);
  expect(service.setPropertyStore).toHaveBeenCalled();
  expect(service.setParam).toHaveBeenCalledWith('audience', scriptProps.API_AUD);
  expect(service.setParam).toHaveBeenCalledWith('organization', 'org-1');
  expect(service.setParam).toHaveBeenCalledWith('prompt', 'consent');
  expect(service.setParam).toHaveBeenCalledWith('login_hint', 'user@test.com');
  expect(svc).toBe(service);
});

