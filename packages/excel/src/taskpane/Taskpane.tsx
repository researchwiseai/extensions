import { useEffect, useState } from 'react';
import './taskpane.css';
import { createRoot } from 'react-dom/client';
import { Settings } from './Settings';
import { Feed } from './Feed';
import { TaskpaneApi } from './api';
import { View } from './types';
import { GoToViewEvent } from './events';
import { setupExcelPKCEAuth } from './pkceAuth';
import { getAccessToken } from 'pulse-common/auth';
import { configureClient } from 'pulse-common/api';
import { Unauthenticated } from './Unauthenticated';
import * as Ribbon from '../services/ribbon';
import { initializeLocalStorage } from '../services/localStorage';

function checkForLogin(success?: () => void, failure?: () => void) {
    const token = sessionStorage.getItem('pkce_token');
    const email = sessionStorage.getItem('user-email');
    const orgId = sessionStorage.getItem('org-id');
    if (token && email && orgId) {
        Ribbon.enableRibbonButtons();
        success?.();
    } else {
        Ribbon.disableRibbonButtons();
        failure?.();
    }
}

export function Taskpane({ api }: { api: TaskpaneApi }) {
    const [view, setView] = useState<View>();
    const [email, setEmail] = useState<string | null>(
        sessionStorage.getItem('user-email'),
    );
    useEffect(() => {
        console.log('Taskpane mounted');

        const handleViewChange = (event: Event) => {
            console.log('Taskpane event', event);
            if (event instanceof GoToViewEvent) {
                setView(event.view);
                checkForLogin();
            }
        };
        const removeViewChangeListener = api.onViewChange(handleViewChange);

        return () => {
            console.log('Taskpane unmounted');
            removeViewChangeListener();
        };
    }, [api]);

    useEffect(() => {
        if (!view) {
            return;
        }
        console.log('Taskpane view changed', view);
        Office.addin.showAsTaskpane();
    }, [view]);

    checkForLogin();

    if (!email) {
        return <Unauthenticated api={api} setEmail={setEmail} />;
    }

    return (
        <>
            {view === 'feed' ? (
                <Feed api={api} />
            ) : (
                <Settings api={api} setEmail={setEmail} />
            )}
        </>
    );
}

const taskpaneApi = new TaskpaneApi();

Office.onReady().then(() => {
    Office.addin.setStartupBehavior(Office.StartupBehavior.load);

    initializeLocalStorage();

    // Determine login state from sessionStorage
    const storedToken = sessionStorage.getItem('pkce_token');
    const storedEmail = sessionStorage.getItem('user-email');
    const organization = sessionStorage.getItem('org-id');
    const redirectUri = `${window.location.origin}/auth-callback.html`;

    let attempts = 0;
    const checkForLoginInterval = setInterval(() => {
        attempts++;
        console.log('Checking for login state...');
        checkForLogin(
            () => {
                clearInterval(checkForLoginInterval);
            },
            () => {
                if (attempts >= 3) {
                    clearInterval(checkForLoginInterval);
                }
            },
        );
    }, 5_000);

    if (storedToken && storedEmail && organization) {
        // Already authenticated: configure and show authenticated view
        setupExcelPKCEAuth({
            domain: 'research-wise-ai-eu.eu.auth0.com',
            clientId: 'kcQuNXgTeKSzztl8kGm5zwJ0RQeX7w1O',
            email: storedEmail,
            redirectUri,
            organization,
            scope: 'openid profile email offline_access',
        });
        configureClient({
            baseUrl: 'https://core.researchwiseai.com',
            getAccessToken,
        });
    } else if (storedToken || storedEmail || organization) {
        // Inconsistent state: clear sessionStorage
        sessionStorage.removeItem('pkce_token');
        sessionStorage.removeItem('user-email');
        sessionStorage.removeItem('org-id');
        Ribbon.disableRibbonButtons();
    }

    const container = document.getElementById('taskpane-root')!;
    createRoot(container).render(<Taskpane api={taskpaneApi} />);
});

export function openSettingsHandler(event?: unknown) {
    taskpaneApi.goToView('settings');
    if (canComplete(event)) {
        event.completed();
    }
}
Office.actions.associate('openSettingsHandler', openSettingsHandler);

interface CanComplete {
    completed: () => void;
}
function canComplete(event: unknown): event is CanComplete {
    return (
        typeof event === 'object' &&
        event !== null &&
        'completed' in event &&
        typeof (event as CanComplete).completed === 'function'
    );
}

export function openFeedHandler(event?: unknown) {
    taskpaneApi.goToView('feed');
    if (canComplete(event)) {
        event.completed();
    }
}
Office.actions.associate('openFeedHandler', openFeedHandler);
