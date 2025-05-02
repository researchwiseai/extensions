import { Polly } from '@pollyjs/core';
import NodeHTTPAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import {
  configureClient,
  analyzeSentiment,
  generateThemes,
  allocateThemes,
} from '../src/apiClient';
import { configureAuth, AuthProvider, getAccessToken } from '../src/auth';

// Skip integration tests if env vars not set
const apiBase = process.env.API_BASE;
const apiToken = process.env.API_TOKEN;
if (!apiBase || !apiToken) {
  console.warn('Skipping Polly integration tests: API_BASE or API_TOKEN not set');
} else {
  /**
   * AuthProvider using environment token.
   */
  class EnvAuth implements AuthProvider {
    async signIn(): Promise<void> {}
    async signOut(): Promise<void> {}
    async getAccessToken(): Promise<string> {
      return apiToken!;
    }
  }

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
      configureAuth(new EnvAuth());
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
      const { themes } = await generateThemes(['test text', 'another text']);
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
      expect(matrix.length).toBe(setA.length);
    });
  });
}