import { ThemeSetManager } from './ThemeSetManager';
import { ModalApi, UpdateModalViewEvent } from '../../modal/api';
import { useEffect, useState } from 'react';
import { Theme, MergerResult } from 'pulse-common';
import { ThemeSetsChoice } from './ThemeSetsChoice';
import { UnexpectedError } from './UnexpectedError';
import { DictionaryMergerDialog } from '../../components/DictionaryMergerDialog';
import { DictionaryMergerErrorBoundary } from '../../components/DictionaryMergerErrorBoundary';

export function ModalRoot({ api }: { api: ModalApi }) {
    const [view, setView] = useState<'themeSets' | 'themeSetsChoice' | 'unexpectedError' | 'dictionaryMerger'>(
        'themeSets',
    );
    const [themeSets, setThemeSets] = useState<Theme[][]>([]);
    const [errorPayload, setErrorPayload] = useState<any | null>(null);
    const [dictionaryData, setDictionaryData] = useState<{
        dictionary: string[];
        extractions: string[][];
        autoGroupRareEntities?: boolean;
    } | null>(null);

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
            } else if (evt.view === 'dictionaryMerger') {
                setView('dictionaryMerger');
                setDictionaryData({
                    dictionary: evt.payload?.dictionary ?? [],
                    extractions: evt.payload?.extractions ?? [],
                    autoGroupRareEntities: evt.payload?.autoGroupRareEntities ?? false
                });
            }
        });
    }, [api]);

    const handleDictionaryMergerComplete = (result: MergerResult | null) => {
        try {
            Office.context.ui.messageParent(
                JSON.stringify({
                    type: 'dictionary-merger-complete',
                    result: result
                })
            );
        } catch (e) {
            console.error('Failed to send merger result to parent', e);
        }
    };

    const handleDictionaryMergerFallback = () => {
        // Fallback to original data when error boundary is triggered
        handleDictionaryMergerComplete(null);
    };

    const handleDictionaryMergerRetry = () => {
        // Force re-render of the dialog by updating the data
        if (dictionaryData) {
            setDictionaryData({ ...dictionaryData });
        }
    };

    return (
        <div className="p-6" style={{ height: '100vh', boxSizing: 'border-box' }}>
            {view === 'themeSets' ? (
                <ThemeSetManager />
            ) : view === 'themeSetsChoice' ? (
                <ThemeSetsChoice themeSets={themeSets} />
            ) : view === 'dictionaryMerger' && dictionaryData &&
                Array.isArray(dictionaryData.dictionary) && dictionaryData.dictionary.length > 0 &&
                Array.isArray(dictionaryData.extractions) && dictionaryData.extractions.length > 0 ? (
                <DictionaryMergerErrorBoundary
                    onFallback={handleDictionaryMergerFallback}
                    onRetry={handleDictionaryMergerRetry}
                >
                    <DictionaryMergerDialog
                        dictionary={dictionaryData.dictionary}
                        extractions={dictionaryData.extractions}
                        autoGroupRareEntities={dictionaryData.autoGroupRareEntities}
                        onComplete={handleDictionaryMergerComplete}
                    />
                </DictionaryMergerErrorBoundary>
            ) : (
                <UnexpectedError payload={errorPayload} />
            )}
        </div>
    );
}
