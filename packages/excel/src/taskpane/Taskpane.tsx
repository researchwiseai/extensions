/* global Office, sessionStorage */
import { useEffect, useState } from 'react';
import './taskpane.css';
import { createRoot } from 'react-dom/client';
import { Settings } from './Settings';
import { Feed } from './Feed';
import { TaskpaneApi } from './api';
import { View } from './types';
import { GoToViewEvent } from './events';
import {
    restorePulseAuthFromStorage,
    clearPulseAuthState,
} from '../services/pulseAuth';
import { Unauthenticated } from './Unauthenticated';
import { initializeLocalStorage } from '../services/localStorage';
import { initializeSentry } from '../services/sentry';

let initialized = false;
let pendingView: View | null = null;

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

    if (!email) {
        return <Unauthenticated api={api} setEmail={setEmail} />;
    }

    return (
        <>
            <Settings api={api} setEmail={setEmail} />
            <Feed api={api} setEmail={setEmail} />
        </>
    );
}

const taskpaneApi = new TaskpaneApi();

Office.onReady().then(() => {
    // Initialize Sentry for error tracking
    initializeSentry();

    Office.addin.setStartupBehavior(Office.StartupBehavior.load);

    initializeLocalStorage();

    // Determine login state from sessionStorage
    const restored = restorePulseAuthFromStorage();
    if (!restored) {
        clearPulseAuthState();
    }

    const container = document.getElementById('taskpane-root')!;
    createRoot(container).render(<Taskpane api={taskpaneApi} />);
    initialized = true;
    document.getElementById('loading-screen')?.remove();
    if (pendingView) {
        taskpaneApi.goToView(pendingView);
        Office.addin.showAsTaskpane();
        pendingView = null;
    }
});

export function openSettingsHandler(event?: unknown) {
    Office.onReady().then(() => {
        Office.addin.showAsTaskpane().then(() => {
            if (!initialized) {
                pendingView = 'settings';
            } else {
                taskpaneApi.goToView('settings');
            }
            if (canComplete(event)) {
                setTimeout(() => event.completed(), 50);
            }
        });
    });
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
    Office.addin.showAsTaskpane();
    if (!initialized) {
        pendingView = 'feed';
    } else {
        taskpaneApi.goToView('feed');
    }
    if (canComplete(event)) {
        setTimeout(() => event.completed(), 50);
    }
}
Office.actions.associate('openFeedHandler', openFeedHandler);
