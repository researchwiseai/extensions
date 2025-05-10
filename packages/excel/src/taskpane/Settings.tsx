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
        </div>
    );
}
