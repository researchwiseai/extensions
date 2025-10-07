import type { TaskpaneApi } from './api';
import { useCallback, useEffect, useState } from 'react';
import logo from '../../assets/logo-filled.png';
import { findOrganization } from 'pulse-common/org';
import { signIn } from 'pulse-common/auth';
import {
    REGISTER_URL,
    MORE_INFO_URL,
    WARMUP_EMAIL,
    WEB_BASE_URL,
    ORG_LOOKUP_PATH,
    getAuthRedirectUri,
    setupPulseAuthProvider,
    persistStoredSession,
    clearPulseAuthState,
} from '../services/pulseAuth';
import { logAuthError, logError, logSuccess } from '../services/sentry';

interface Props {
    api: TaskpaneApi;
    setEmail: (email: string | null) => void;
}
function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Unauthenticated
 * Renders the sign-in form for Pulse.
 * Flow:
 * 1. User enters email
 * 2. We look up the organization for the email
 * 3. Configure PKCE Auth with org
 * 4. Trigger sign in, store org + email, configure API client
 */
export function Unauthenticated({ setEmail: setAppEmail }: Props) {
    const [connecting, setConnecting] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Warm Lambda / org lookup to reduce latency on first real sign-in
    useEffect(() => {
        const orgLookupUrl = `${WEB_BASE_URL}${ORG_LOOKUP_PATH}`;
        findOrganization(orgLookupUrl, WARMUP_EMAIL).catch(() => {
            /* ignore warm-up errors */
        });
    }, []);

    const handleRegister = useCallback(() => {
        window.open(REGISTER_URL, '_blank');
    }, []);

    const handleMoreInfo = useCallback(() => {
        window.open(MORE_INFO_URL, '_blank');
    }, []);

    const clickConnect = useCallback(
        async (rawEmail: string) => {
            const trimmedEmail = rawEmail.trim();
            if (!isValidEmail(trimmedEmail) || connecting) return;

            setConnecting(true);
            setError(null); // Clear any previous errors

            try {
                const redirectUri = getAuthRedirectUri();
                const orgLookupUrl = `${WEB_BASE_URL}${ORG_LOOKUP_PATH}`;

                logSuccess('auth:org_lookup_start', { email: trimmedEmail });

                const orgResult = await findOrganization(orgLookupUrl, trimmedEmail);
                if (!orgResult.success) {
                    if (orgResult.notFound) {
                        const errorMessage = 'No account found for this email. Please sign up at https://researchwiseai.com';
                        setError(errorMessage);
                        logAuthError('auth:org_not_found', new Error('Organization not found'), {
                            email: trimmedEmail,
                            orgLookupUrl,
                        });
                    } else {
                        const errorMessage = 'Error finding account. Please try again later.';
                        setError(errorMessage);
                        logAuthError('auth:org_lookup_failed', new Error('Organization lookup failed'), {
                            email: trimmedEmail,
                            orgLookupUrl,
                            orgResult,
                        });
                    }
                    return;
                }

                logSuccess('auth:org_lookup_success', {
                    email: trimmedEmail,
                    organization: orgResult.orgId
                });

                const organization = orgResult.orgId!;
                const session = { email: trimmedEmail, organization };
                setupPulseAuthProvider(session, redirectUri);

                logSuccess('auth:provider_setup_complete', {
                    email: trimmedEmail,
                    organization
                });

                await signIn();

                logSuccess('auth:signin_complete', { email: trimmedEmail });

                persistStoredSession(session);
                setAppEmail(trimmedEmail);
            } catch (err) {
                const errorMessage = 'Sign-in failed. Please try again.';
                setError(errorMessage);
                logAuthError('auth:signin_failed', err, {
                    email: trimmedEmail,
                    step: 'signin_or_setup',
                });
                clearPulseAuthState();
            } finally {
                setConnecting(false);
            }
        },
        [connecting, setAppEmail],
    );

    const disableSignIn = connecting || !isValidEmail(email);

    return (
        <div className="pulse-auth" style={{ padding: 20 }}>
            <div style={{ maxWidth: 360, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <img
                        src={logo}
                        alt="Pulse"
                        width={72}
                        height={72}
                        style={{ display: 'block', margin: '0 auto' }}
                    />
                    <h2
                        style={{
                            margin: '12px 0 0',
                            fontWeight: 600,
                            fontSize: 20,
                        }}
                    >
                        Sign in to Pulse
                    </h2>
                    <div style={{ marginTop: 4, color: '#605e5c', fontSize: 12 }}>
                        by ResearchWiseAI
                    </div>
                </div>

                <label htmlFor="pulse-auth-email" style={{ fontWeight: 600 }}>
                    Email
                </label>
                <input
                    id="pulse-auth-email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        // Clear error when user starts typing
                        if (error) setError(null);
                    }}
                    className="pulse-input"
                    style={{ margin: '8px 0' }}
                    autoComplete="email"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !disableSignIn) {
                            clickConnect(email);
                        }
                    }}
                />

                {error && (
                    <div
                        className="pulse-error-message"
                        style={{
                            color: '#d13438',
                            fontSize: '12px',
                            marginTop: '4px',
                            marginBottom: '8px',
                            padding: '8px',
                            backgroundColor: '#fdf2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px'
                        }}
                    >
                        {error}
                    </div>
                )}

                <div className="actions" style={{ marginTop: 8 }}>
                    <button
                        id="pulse-auth-continue"
                        disabled={disableSignIn}
                        onClick={() => clickConnect(email)}
                        className="pulse-btn pulse-btn--primary pulse-btn--block"
                        style={{ padding: '10px 14px' }}
                    >
                        {connecting ? 'Connecting…' : 'Sign in'}
                    </button>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        margin: '16px 0',
                        color: '#666',
                    }}
                >
                    <div style={{ flex: 1, height: 1, background: '#e1dfdd' }}></div>
                    <div style={{ padding: '0 8px' }}>or</div>
                    <div style={{ flex: 1, height: 1, background: '#e1dfdd' }}></div>
                </div>

                <div className="actions">
                    <button
                        id="pulse-auth-register"
                        onClick={handleRegister}
                        className="pulse-btn pulse-btn--secondary pulse-btn--block"
                        style={{ padding: '10px 14px' }}
                    >
                        Register
                    </button>
                    <button
                        id="pulse-auth-moreinfo"
                        onClick={handleMoreInfo}
                        className="pulse-btn pulse-btn--secondary pulse-btn--block"
                        style={{ padding: '10px 14px', marginTop: 8 }}
                    >
                        More info
                    </button>
                </div>
            </div>
        </div>
    );
}
