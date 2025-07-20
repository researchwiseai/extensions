import { PrimaryButton, DefaultButton, TextField } from '@fluentui/react';
import type { TaskpaneApi } from './api';
import { useCallback, useEffect, useState } from 'react';
// Import company logo via webpack asset module for correct path resolution
import logo from '../../assets/logo-filled.png';
import { findOrganization } from 'pulse-common/org';
import { setupExcelPKCEAuth } from './pkceAuth';
import { getAccessToken, signIn } from 'pulse-common/auth';
import { configureClient } from 'pulse-common/api';
import { getRelativeUrl } from '../services/relativeUrl';
import { showConnectHelpDialog } from '../services/connectHelp';

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
        const url = 'https://researchwiseai.com/register';
        // open in new tab/window
        window.open(url, '_blank');
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
        <div className="bg-[#f3f2f1] h-full">
            <header className="flex flex-col items-center w-full h-[200px] mt-10 relative space-y-5">
                <img
                    width="90"
                    height="90"
                    src={logo}
                    alt="Pulse"
                    title="Pulse"
                />
                <h1 className="ms-font-su">Pulse</h1>
            </header>
            <main
                id="app-body"
                className="flex flex-col items-center w-full space-y-5 pb-10"
            >
                <h2 className="ms-font-xl">AI-Powered Analysis for Excel</h2>
                <ul className="flex flex-col space-x-2">
                    <li className="ms-ListItem">
                        <i
                            className="ms-Icon ms-Icon--Emoji2 ms-font-xl mr-3"
                            aria-hidden="true"
                        ></i>
                        <span className="ms-font-m">Analyze Sentiment</span>
                    </li>
                    <li className="ms-ListItem">
                        <i
                            className="ms-Icon ms-Icon--BulletedListText ms-font-xl mr-3"
                            aria-hidden="true"
                        ></i>
                        <span className="ms-font-m">Generate Themes</span>
                    </li>
                    <li className="ms-ListItem">
                        <i
                            className="ms-Icon ms-Icon--Tag ms-font-xl mr-3"
                            aria-hidden="true"
                        ></i>
                        <span className="ms-font-m">Allocate Themes</span>
                    </li>
                </ul>
                <TextField
                    label="Email"
                    className="w-[85%]"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e, newValue) => setEmail(newValue || '')}
                />
                <div className="flex space-x-2 mt-5">
                    <PrimaryButton
                        disabled={connecting}
                        onClick={() => clickConnect(email)}
                        id="start"
                    >
                        {connecting ? 'Connecting...' : 'Start'}
                    </PrimaryButton>
                    <DefaultButton id="register" onClick={handleRegister}>
                        Register
                    </DefaultButton>
                </div>
            </main>
        </div>
    );
}
