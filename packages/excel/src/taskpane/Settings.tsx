import { TaskpaneApi } from './api';
// Import company logo via webpack asset module for correct path resolution
import { DefaultButton, Text } from '@fluentui/react';
import { signOut } from 'pulse-common/auth';
import { useEffect, useState } from 'react';
// Word Online integration removed; only local download is available.

interface Props {
    api: TaskpaneApi;
    setEmail: (email: string | null) => void;
}

export function Settings({ setEmail }: Props) {
    const email = sessionStorage.getItem('user-email');
    // Graph/Identity not used currently

    console.log('Settings component mounted', email);

    useEffect(() => {}, []);

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

    // No-op placeholders retained for future Word Online integration

    return (
        <div className="bg-[#f3f2f1]">
            <header className="flex flex-row justify-between m-5">
                <div id="user-in">
                    <Text>{email}</Text>
                </div>
                <DefaultButton id="logout" onClick={logout}>
                    Logout
                </DefaultButton>
            </header>
        </div>
    );
}
