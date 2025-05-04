"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables from .env file at project root
require("dotenv/config");
const core_1 = require("@pollyjs/core");
const adapter_node_http_1 = __importDefault(require("@pollyjs/adapter-node-http"));
const persister_fs_1 = __importDefault(require("@pollyjs/persister-fs"));
const bun_test_1 = require("bun:test");
const apiClient_js_1 = require("../src/apiClient.js");
const auth_js_1 = require("../src/auth.js");
// Skip integration tests if env vars not set
const apiBase = `https://${process.env.TEST_DOMAIN}`;
const authDomain = process.env.TEST_CLIENT_TENANT;
const clientId = process.env.TEST_CLIENT_ID;
const clientSecret = process.env.TEST_CLIENT_SECRET;
const apiAud = process.env.TEST_AUDIENCE;
if (!apiBase || !authDomain || !clientId || !clientSecret || !apiAud) {
    console.warn('Skipping Polly integration tests: missing one of API_BASE, TEST_CLIENT_TENANT, TEST_CLIENT_ID, TEST_CLIENT_SECRET, or API_AUD');
}
else {
    // Configure Auth0 client credentials provider
    const authProvider = (0, auth_js_1.createAuth0Provider)({
        domain: authDomain,
        clientId: clientId,
        clientSecret: clientSecret,
        audience: apiAud,
    });
    (0, bun_test_1.describe)('Integration: Pulse API via Polly', () => {
        let polly;
        (0, bun_test_1.beforeAll)(() => {
            core_1.Polly.register(adapter_node_http_1.default);
            core_1.Polly.register(persister_fs_1.default);
        });
        (0, bun_test_1.beforeEach)(() => {
            polly = new core_1.Polly('pulse-common-integration', {
                adapters: ['node-http'],
                persister: 'fs',
                recordIfMissing: true,
                matchRequestsBy: {
                    headers: { exclude: ['authorization', 'user-agent', 'accept', 'host'] },
                },
                persisterOptions: { fs: { recordingsDir: 'test/recordings' } },
            });
            (0, auth_js_1.configureAuth)(authProvider);
            (0, apiClient_js_1.configureClient)({ baseUrl: apiBase, getAccessToken: auth_js_1.getAccessToken });
        });
        (0, bun_test_1.afterEach)(async () => {
            await polly.stop();
        });
        (0, bun_test_1.it)('analyzeSentiment fast returns immediate results', async () => {
            const { results } = await (0, apiClient_js_1.analyzeSentiment)(['hello world'], true);
            (0, bun_test_1.expect)(results).toBeDefined();
            (0, bun_test_1.expect)(Array.isArray(results)).toBe(true);
            (0, bun_test_1.expect)(results.length).toBeGreaterThan(0);
        });
        (0, bun_test_1.it)('generateThemes returns themes synchronously (fast)', async () => {
            const { themes } = await (0, apiClient_js_1.generateThemes)(['test text', 'another text'], { fast: true });
            (0, bun_test_1.expect)(themes).toBeDefined();
            (0, bun_test_1.expect)(Array.isArray(themes)).toBe(true);
            (0, bun_test_1.expect)(themes.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(typeof themes[0].label).toBe('string');
        });
        (0, bun_test_1.it)('allocateThemes fast returns similarity matrix', async () => {
            const setA = ['a', 'b'];
            const setB = ['x', 'y'];
            const { matrix } = await (0, apiClient_js_1.allocateThemes)(setA, setB, true);
            (0, bun_test_1.expect)(matrix).toBeDefined();
            (0, bun_test_1.expect)(Array.isArray(matrix)).toBe(true);
            (0, bun_test_1.expect)(matrix.length).toBe(setA.length);
        });
    });
}
