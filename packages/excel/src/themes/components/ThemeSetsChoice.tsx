import { Theme } from 'pulse-common';

export function ThemeSetsChoice({ themeSets }: { themeSets: Theme[][] }) {
    const sets: Theme[][] = Array.isArray(themeSets)
        ? themeSets.filter((s) => Array.isArray(s))
        : [];
    const choose = (set: Theme[]) => {
        try {
            Office.context.ui.messageParent(
                JSON.stringify({ type: 'themeSets-choice-selected', set }),
            );
        } catch (e) {
            console.error('Failed to message parent with selected set', e);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-xl font-semibold mb-2">Select a Theme Set</h2>
            <p className="mb-4">
                Review the three generated options and choose one to use.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ flex: 1, overflow: 'auto' }}>
                {sets.map((set, i) => (
                    <div key={i} className="border rounded p-3 bg-white" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="font-semibold text-lg mb-2">Option {i + 1}</div>
                        <div style={{ overflow: 'auto' }}>
                            {(set || []).map((t, j) => (
                                <div key={j} className="mb-3">
                                    <div className="font-semibold">{t.label}</div>
                                    <div className="text-gray-700">{t.description}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-right">
                            <button className="ms-Button ms-Button--primary" onClick={() => choose(set)}>
                                <span className="ms-Button-label">Use this set</span>
                            </button>
                        </div>
                    </div>
                ))}
                {sets.length === 0 && (
                    <div className="text-gray-700">No theme sets received.</div>
                )}
            </div>
        </div>
    );
}
