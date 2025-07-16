import { describe, it, expect, beforeEach } from 'bun:test';
import type { ShortTheme } from '../src/themes.js';
import { allocateThemes } from '../src/themes.js';
import { configureClient, configureFetch } from '../src/apiClient.js';

let matrix: number[][] = [[0]];

configureClient({ baseUrl: 'http://test', getAccessToken: async () => '' });
configureFetch(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ matrix }),
    text: async () => JSON.stringify({ matrix }),
}));

beforeEach(() => {
    matrix = [[0]];
});

describe('allocateThemes threshold', () => {
    const themes: ShortTheme[] = [{ label: 'A', representatives: ['a'] }];

    it('uses default threshold of 0.4', async () => {
        matrix = [[0.3]];
        const [result] = await allocateThemes(['test'], themes);
        expect(result.belowThreshold).toBe(true);
    });

    it('respects provided threshold', async () => {
        matrix = [[0.5]];
        const [result] = await allocateThemes(['test'], themes, { threshold: 0.6 });
        expect(result.score).toBe(0.5);
        expect(result.belowThreshold).toBe(true);
    });

    it('marks allocation as above threshold when score is high', async () => {
        matrix = [[0.8]];
        const [result] = await allocateThemes(['test'], themes, { threshold: 0.6 });
        expect(result.belowThreshold).toBe(false);
    });
});
