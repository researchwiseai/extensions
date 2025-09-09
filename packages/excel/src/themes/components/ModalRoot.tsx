import { ThemeSetManager } from './ThemeSetManager';
import { ModalApi, UpdateModalViewEvent } from '../../modal/api';
import { useEffect, useState } from 'react';
import { Theme } from 'pulse-common';
import { ThemeSetsChoice } from './ThemeSetsChoice';
import { UnexpectedError } from './UnexpectedError';

export function ModalRoot({ api }: { api: ModalApi }) {
    const [view, setView] = useState<'themeSets' | 'themeSetsChoice' | 'unexpectedError'>(
        'themeSets',
    );
    const [themeSets, setThemeSets] = useState<Theme[][]>([]);
    const [errorPayload, setErrorPayload] = useState<any | null>(null);

    useEffect(() => {
        return api.onViewChange((evt: UpdateModalViewEvent) => {
            if (evt.view === 'themeSetsChoice') {
                setView('themeSetsChoice');
                setThemeSets(evt.payload?.themeSets ?? []);
            } else if (evt.view === 'themeSets') {
                setView('themeSets');
            } else if (evt.view === 'unexpectedError') {
                setView('unexpectedError');
                setErrorPayload(evt.payload ?? null);
            }
        });
    }, [api]);

    return (
        <div className="p-6" style={{ height: '100vh', boxSizing: 'border-box' }}>
            {view === 'themeSets' ? (
                <ThemeSetManager />
            ) : view === 'themeSetsChoice' ? (
                <ThemeSetsChoice themeSets={themeSets} />
            ) : (
                <UnexpectedError payload={errorPayload} />
            )}
        </div>
    );
}
