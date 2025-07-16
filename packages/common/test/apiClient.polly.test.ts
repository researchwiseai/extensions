// Load environment variables from .env file at project root
import 'dotenv/config';
import { Polly } from '@pollyjs/core';
import NodeHTTPAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import {
  configureClient,
  analyzeSentiment,
  generateThemes,
} from '../src/apiClient.js';
import { allocateThemes } from '../src/themes.js';
import { configureAuth, createAuth0Provider, getAccessToken } from '../src/auth.js';

// Skip integration tests if env vars not set
const apiBase = `https://${process.env.TEST_DOMAIN}`;
const authDomain = process.env.TEST_CLIENT_TENANT;
const clientId = process.env.TEST_CLIENT_ID;
const clientSecret = process.env.TEST_CLIENT_SECRET;
const apiAud = process.env.TEST_AUDIENCE;
if (!apiBase || !authDomain || !clientId || !clientSecret || !apiAud) {
  console.warn(
    'Skipping Polly integration tests: missing one of API_BASE, TEST_CLIENT_TENANT, TEST_CLIENT_ID, TEST_CLIENT_SECRET, or API_AUD'
  );
} else {
  // Configure Auth0 client credentials provider
  const authProvider = createAuth0Provider({
    domain: authDomain,
    clientId: clientId,
    clientSecret: clientSecret,
    audience: apiAud,
  });

  describe('Integration: Pulse API via Polly', () => {
    let polly: Polly;

    beforeAll(() => {
      Polly.register(NodeHTTPAdapter);
      Polly.register(FSPersister);
    });

    beforeEach(() => {
      polly = new Polly('pulse-common-integration', {
        adapters: ['node-http'],
        persister: 'fs',
        recordIfMissing: true,
        matchRequestsBy: {
          headers: { exclude: ['authorization', 'user-agent', 'accept', 'host'] },
        },
        persisterOptions: { fs: { recordingsDir: 'test/recordings' } },
      });
      configureAuth(authProvider);
      configureClient({ baseUrl: apiBase, getAccessToken });
    });

    afterEach(async () => {
      await polly.stop();
    });

    it('analyzeSentiment fast returns immediate results', async () => {
      const { results } = await analyzeSentiment(['hello world'], true);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results!.length).toBeGreaterThan(0);
    });

    it('generateThemes returns themes synchronously (fast)', async () => {
      const { themes } = await generateThemes(['test text', 'another text'], { fast: true });
      expect(themes).toBeDefined();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes!.length).toBeGreaterThan(0);
      expect(typeof themes![0].label).toBe('string');
    });

    it('allocateThemes fast returns similarity matrix', async () => {
      const setA = ['a', 'b'];
      const setB = ['x', 'y'];
      const { matrix } = await allocateThemes(setA, setB, true);
      expect(matrix).toBeDefined();
      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix!.length).toBe(setA.length);
    });
  });
}