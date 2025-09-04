import { ThemeSetManager } from './ThemeSetManager';
import { ModalApi, UpdateModalViewEvent } from '../../modal/api';
import { useEffect, useState } from 'react';
import { Theme } from 'pulse-common';
import { ThemeSetsChoice } from './ThemeSetsChoice';

export function ModalRoot({ api }: { api: ModalApi }) {
    const [view, setView] = useState<'themeSets' | 'themeSetsChoice'>(
        'themeSets',
    );
    const [themeSets, setThemeSets] = useState<Theme[][]>([]);

    useEffect(() => {
        return api.onViewChange((evt: UpdateModalViewEvent) => {
            if (evt.view === 'themeSetsChoice') {
                setView('themeSetsChoice');
                setThemeSets(evt.payload?.themeSets ?? []);
            } else if (evt.view === 'themeSets') {
                setView('themeSets');
            }
        });
    }, [api]);

    return (
        <div className="p-6" style={{ height: '100vh', boxSizing: 'border-box' }}>
            {view === 'themeSets' ? (
                <ThemeSetManager />
            ) : (
                <ThemeSetsChoice themeSets={themeSets} />
            )}
        </div>
    );
}
