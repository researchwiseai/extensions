"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_js_1 = require("../src/auth.js");
/**
 * Dummy AuthProvider for testing.
 */
class DummyAuth {
    constructor(token) {
        this.signedIn = false;
        this.token = token;
    }
    async signIn() {
        this.signedIn = true;
    }
    async signOut() {
        this.signedIn = false;
    }
    async getAccessToken() {
        if (!this.signedIn) {
            throw new Error('Not signed in');
        }
        return this.token;
    }
}
describe('Authentication abstraction', () => {
    it('throws if used before configureAuth', async () => {
        (0, auth_js_1.configureAuth)(null);
        await expect((0, auth_js_1.signIn)()).rejects.toThrow('AuthProvider not configured');
        await expect((0, auth_js_1.signOut)()).rejects.toThrow('AuthProvider not configured');
        await expect((0, auth_js_1.getAccessToken)()).rejects.toThrow('AuthProvider not configured');
    });
    it('delegate calls to provided AuthProvider', async () => {
        const dummy = new DummyAuth('tok-123');
        (0, auth_js_1.configureAuth)(dummy);
        // signIn sets signedIn = true
        await expect((0, auth_js_1.signIn)()).resolves.toBeUndefined();
        // getAccessToken should now succeed
        await expect((0, auth_js_1.getAccessToken)()).resolves.toBe('tok-123');
        // signOut sets signedIn = false
        await expect((0, auth_js_1.signOut)()).resolves.toBeUndefined();
        // subsequent getAccessToken should fail
        await expect((0, auth_js_1.getAccessToken)()).rejects.toThrow('Not signed in');
    });
});
