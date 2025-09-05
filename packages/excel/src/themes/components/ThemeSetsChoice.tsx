import { Theme } from 'pulse-common';
import { useState, useMemo, KeyboardEvent } from 'react';

export function ThemeSetsChoice({ themeSets }: { themeSets: Theme[][] }) {
    const sets: Theme[][] = useMemo(
        () => (Array.isArray(themeSets) ? themeSets.filter((s) => Array.isArray(s)) : []),
        [themeSets],
    );

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const choose = (set: Theme[]) => {
        try {
            Office.context.ui.messageParent(
                JSON.stringify({ type: 'themeSets-choice-selected', set }),
            );
        } catch (e) {
            console.error('Failed to message parent with selected set', e);
        }
    };

    const onCardKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setSelectedIndex(index);
        }
    };

    const canUse = selectedIndex !== null && sets[selectedIndex];

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-2">Select a Theme Set</h2>
            <p className="mb-4">Review the three generated options and choose one to use.</p>

            <div className="flex-1 overflow-auto" role="radiogroup" aria-label="Theme set options">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sets.map((set, i) => {
                        const selected = selectedIndex === i;
                        return (
                            <div
                                key={i}
                                role="radio"
                                aria-checked={selected}
                                tabIndex={0}
                                onClick={() => setSelectedIndex(i)}
                                onKeyDown={(e) => onCardKeyDown(e, i)}
                                className={
                                    `relative h-full flex flex-col rounded-md border-2 p-3 bg-white cursor-pointer transition-colors ` +
                                    (selected
                                        ? 'border-teal-600 ring-2 ring-teal-500'
                                        : 'border-gray-200 hover:border-gray-300')
                                }
                            >
                                {/* Selected badge */}
                                {selected && (
                                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-teal-700 text-xs font-semibold">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 border border-teal-600 text-teal-700">✓</span>
                                        Selected
                                    </div>
                                )}

                                <div className="font-semibold text-lg mb-2">Option {i + 1}</div>
                                <div className="overflow-auto">
                                    {(set || []).map((t, j) => (
                                        <div key={j} className="mb-3">
                                            <div className="font-semibold">{t.label}</div>
                                            <div className="text-gray-700">{t.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {sets.length === 0 && (
                        <div className="text-gray-700">No theme sets received.</div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    disabled={!canUse}
                    onClick={() => canUse && choose(sets[selectedIndex as number])}
                    className={
                        `text-xs font-semibold rounded px-2.5 py-1.5 ` +
                        (canUse
                            ? 'bg-teal-700 text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed')
                    }
                >
                    Use selected
                </button>
            </div>
        </div>
    );
}
