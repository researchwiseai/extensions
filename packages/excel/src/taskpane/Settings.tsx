import { TaskpaneApi } from './api';
// Import company logo via webpack asset module for correct path resolution
import logo from '../../assets/logo-filled.png';
import { DefaultButton, Text } from '@fluentui/react';
import { signOut } from 'pulse-common/auth';

interface Props {
    api: TaskpaneApi;
    setEmail: (email: string | null) => void;
}

export function Settings({ setEmail }: Props) {
    const email = sessionStorage.getItem('user-email');

    console.log('Settings component mounted', email);

    const logout = async () => {
        try {
            await signOut();
            sessionStorage.removeItem('pkce_token');
            sessionStorage.removeItem('org-id');
        } finally {
            sessionStorage.removeItem('user-email');
            setEmail(null);
        }
    };

    return (
        <div className="bg-[#f3f2f1] h-full">
            <header className="flex flex-col items-center justify-center w-full h-[200px] mt-[100px] relative space-y-5">
                <img
                    width="90"
                    height="90"
                    src={logo}
                    alt="Pulse"
                    title="Pulse"
                />
                <h1 className="ms-font-su">Pulse</h1>
                <DefaultButton id="logout" onClick={logout}>
                    Logout
                </DefaultButton>
                <div id="user-in">
                    <Text>{email}</Text>
                </div>
            </header>
            <main id="app-body" className="ms-welcome__main hidden">
                <h2 className="ms-font-xl">AI-Powered Analysis for Excel</h2>
                <ul className="ms-List ms-welcome__features">
                    <li className="ms-ListItem">
                        <i
                            className="ms-Icon ms-Icon--Emoji2 ms-font-xl"
                            aria-hidden="true"
                        ></i>
                        <span className="ms-font-m">Analyze Sentiment</span>
                    </li>
                    <li className="ms-ListItem">
                        <i
                            className="ms-Icon ms-Icon--BulletedListText ms-font-xl"
                            aria-hidden="true"
                        ></i>
                        <span className="ms-font-m">Generate Themes</span>
                    </li>
                    <li className="ms-ListItem">
                        <i
                            className="ms-Icon ms-Icon--Tag ms-font-xl"
                            aria-hidden="true"
                        ></i>
                        <span className="ms-font-m">Allocate Themes</span>
                    </li>
                </ul>
                <p className="ms-font-l">Please enter your email to connect:</p>
                <div className="ms-TextField w-full mb-3">
                    <input
                        type="email"
                        id="email-input"
                        placeholder="you@email.com"
                        className="ms-TextField-field w-[84]% ml-[8%]"
                    />
                </div>
                <button
                    id="connect"
                    className="ms-welcome__action ms-Button ms-Button--hero ms-font-xl"
                >
                    <span className="ms-Button-label">Connect</span>
                </button>
            </main>
            <main
                id="authenticated-app"
                className="ms-welcome__main"
                // style="
                //     padding: 0;
                //     display: none;
                //     flex-direction: column;
                //     align-items: flex-start;
                //     width: 100%;
                // "
            >
                {/* <div
                    id="jobs-container"
                    // style="width: 100%; padding: 0 10px 10px 10px"
                >
                    <h3 className="ms-font-l">Running Jobs</h3>
                    <ul
                        id="jobs-list"
                        className="ms-List"
                        // style="
                        //     list-style-type: none;
                        //     padding-left: 0;
                        //     max-height: 200px;
                        //     overflow-y: auto;
                        // "
                    ></ul>
                </div> */}
            </main>
        </div>
    );
}
