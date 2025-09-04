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
    // Remove email display from taskpane; keep component for future use
    useEffect(() => {}, []);
    return null;
}
