import { configureAuth, signIn, signOut, getAccessToken, AuthProvider } from '../src/auth.js';

/**
 * Dummy AuthProvider for testing.
 */
class DummyAuth implements AuthProvider {
  private token: string;
  private signedIn = false;
  constructor(token: string) {
    this.token = token;
  }
  async signIn(): Promise<void> {
    this.signedIn = true;
  }
  async signOut(): Promise<void> {
    this.signedIn = false;
  }
  async getAccessToken(): Promise<string> {
    if (!this.signedIn) {
      throw new Error('Not signed in');
    }
    return this.token;
  }
}

describe('Authentication abstraction', () => {
  it('throws if used before configureAuth', async () => {
    configureAuth(null)
    await expect(signIn()).rejects.toThrow('AuthProvider not configured');
    await expect(signOut()).rejects.toThrow('AuthProvider not configured');
    await expect(getAccessToken()).rejects.toThrow('AuthProvider not configured');
  });

  it('delegate calls to provided AuthProvider', async () => {
    const dummy = new DummyAuth('tok-123');
    configureAuth(dummy);
    // signIn sets signedIn = true
    await expect(signIn()).resolves.toBeUndefined();
    // getAccessToken should now succeed
    await expect(getAccessToken()).resolves.toBe('tok-123');
    // signOut sets signedIn = false
    await expect(signOut()).resolves.toBeUndefined();
    // subsequent getAccessToken should fail
    await expect(getAccessToken()).rejects.toThrow('Not signed in');
  });
});