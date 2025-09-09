import type { TaskpaneApi } from './api';
import { useCallback, useState } from 'react';
import logo from '../../assets/logo-filled.png';
import { findOrganization } from 'pulse-common/org';
import { setupExcelPKCEAuth } from './pkceAuth';
import { getAccessToken, signIn } from 'pulse-common/auth';
import { configureClient } from 'pulse-common/api';
import { getRelativeUrl } from '../services/relativeUrl';

interface Props {
    api: TaskpaneApi;
    setEmail: (email: string | null) => void;
}
export function Unauthenticated({ setEmail: setAppEmail }: Props) {
    const [connecting, setConnecting] = useState(false);
    const [email, setEmail] = useState('');

    // Temporarily disable the "Getting Started" dialog as it appears on every
    // launch. Once we have a persistent dismissal mechanism this can be
    // re-enabled.
    // useEffect(() => {
    //     showConnectHelpDialog().catch((e) => console.error(e));
    // }, []);
    // Registration URL opens in browser for new users
    const handleRegister = useCallback(() => {
        window.open('https://researchwiseai.com/register', '_blank');
    }, []);
    const handleMoreInfo = useCallback(() => {
        window.open('https://researchwiseai.com/pulse', '_blank');
    }, []);

    const clickConnect = useCallback(
        async (email: string) => {
            setConnecting(true);

            const domain = 'research-wise-ai-eu.eu.auth0.com';
            const clientId = 'kcQuNXgTeKSzztl8kGm5zwJ0RQeX7w1O';

            // Redirect URI must match your Auth0 app and maps to auth-callback.html
            const redirectUri = getRelativeUrl('auth-callback.html');
            const scope = 'openid profile email offline_access';
            const apiBase = 'https://pulse.researchwiseai.com';

            const webBase = 'https://researchwiseai.com';
            const orgLookupUrl = `${webBase}/users`;
            const orgResult = await findOrganization(orgLookupUrl, email);

            if (!orgResult.success) {
                setConnecting(false);
                if (orgResult.notFound) {
                    alert(
                        'No account found for this email. Please sign up at https://researchwiseai.com',
                    );
                } else {
                    alert('Error finding account. Please try again later.');
                }
                return;
            } else {
                const organization = orgResult.orgId!;

                // Configure the PKCE AuthProvider with the user's organization
                setupExcelPKCEAuth({
                    domain,
                    clientId,
                    email,
                    redirectUri,
                    scope,
                    organization,
                });
                // Save the organization ID in sessionStorage
                sessionStorage.setItem('org-id', organization);
                // Perform interactive sign-in
                await signIn();
                sessionStorage.setItem('user-email', email);

                // Initialize the Pulse API client
                configureClient({ baseUrl: apiBase, getAccessToken });

                console.log('✅ Connected and authenticated');

                setAppEmail(email);
            }
        },
        [setConnecting],
    );

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
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                        width: '100%',
                        padding: 8,
                        margin: '8px 0',
                        boxSizing: 'border-box',
                        background: '#fff',
                        border: '1px solid #8a8886',
                        borderRadius: 4,
                    }}
                />

                <div className="actions" style={{ marginTop: 8 }}>
                    <button
                        id="pulse-auth-continue"
                        disabled={connecting}
                        onClick={() => clickConnect(email)}
                        className="pulse-btn pulse-btn--primary pulse-btn--block"
                        style={{ padding: '10px 14px' }}
                    >
                        {connecting ? 'Connecting…' : 'Sign in'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: '#666' }}>
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
