/**
 * Authentication provider interface.
 */
export interface AuthProvider {
  /** Perform sign-in flow. */
  signIn(): Promise<void>;
  /** Perform sign-out flow. */
  signOut(): Promise<void>;
  /** Get current access token for API calls. */
  getAccessToken(): Promise<string>;
}

let provider: AuthProvider | null = null;

/**
 * Configure the authentication provider to use.
 * Must be called before signIn, signOut, or getAccessToken.
 */
export function configureAuth(authProvider: AuthProvider): void {
  provider = authProvider;
}

function ensureProvider(): AuthProvider {
  if (!provider) {
    throw new Error('AuthProvider not configured. Call configureAuth() first.');
  }
  return provider;
}

/**
 * Initiate user sign-in.
 */
export async function signIn(): Promise<void> {
  const p = ensureProvider();
  return p.signIn();
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const p = ensureProvider();
  return p.signOut();
}

/**
 * Retrieve an access token for authenticating API requests.
 */
export async function getAccessToken(): Promise<string> {
  const p = ensureProvider();
  return p.getAccessToken();
}