import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogType,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
} from '@fluentui/react';

import { ThemeSetList } from './ThemeSetList';
import { ThemeSetForm } from './ThemeSetForm';
import { ThemeSetDetail } from './ThemeSetDetail';
import {
    getThemeSets,
    saveAllThemeSets,
    ShortTheme,
    ThemeSet,
} from 'pulse-common/themes';
import type { Theme } from 'pulse-common';
// Interact with the workbook via parent (shared-runtime) using dialog messaging

export function ThemeSetManager() {
    const [view, setView] = useState<'list' | 'create' | 'detail' | 'edit'>(
        'list',
    );
    const [themeSets, setThemeSets] = useState<ThemeSet<ShortTheme>[]>([]);
    const [selected, setSelected] = useState<ThemeSet | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<ThemeSet | null>(null);
    const [hasThemesSheet, setHasThemesSheet] = useState<boolean>(false);
    const [sheetHash, setSheetHash] = useState<string | null>(null);
    const [importing, setImporting] = useState<boolean>(false);
    const [creatingSheet, setCreatingSheet] = useState<boolean>(false);

    useEffect(() => {
        getThemeSets().then((sets) => {
            console.log('Theme sets loaded', sets);
            setThemeSets(sets);
        });
    }, []);

    useEffect(() => {
        saveAllThemeSets(themeSets);
    }, [themeSets]);

    // Normalize and hash utilities to compare sets to the Themes worksheet
    const normalizeThemes = (themes: Array<ShortTheme | Theme>) => {
        return themes
            .map((t) => ({
                label: String(t.label || '').trim().toLowerCase(),
                representatives: (t.representatives || [])
                    .map((r) => String(r || '').trim().toLowerCase())
                    .sort(),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    const hashString = (input: string) => {
        // djb2 string hash
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
            hash = (hash * 33) ^ input.charCodeAt(i);
        }
        return (hash >>> 0).toString(16);
    };

    const hashThemes = (themes: Array<ShortTheme | Theme>) =>
        hashString(JSON.stringify(normalizeThemes(themes)));

    const themeSetHashes = useMemo(() => {
        const map = new Map<string, string>();
        themeSets.forEach((set) => {
            map.set(set.name, hashThemes(set.themes));
        });
        return map;
    }, [themeSets]);

    const matchedSetName = useMemo(() => {
        if (!sheetHash) return null;
        for (const [name, h] of themeSetHashes.entries()) {
            if (h === sheetHash) return name;
        }
        return null;
    }, [sheetHash, themeSetHashes]);

    // RPC: handle parent messages (status/read/create responses)
    useEffect(() => {
        const handler = (arg: any) => {
            try {
                const msg = JSON.parse(arg.message || '{}');
                if (msg && msg.type === 'themes-sheet-status-response') {
                    setHasThemesSheet(!!msg.exists);
                    if (msg.exists && Array.isArray(msg.themes)) {
                        const h = hashThemes(msg.themes as Array<ShortTheme | Theme>);
                        setSheetHash(h);
                    } else {
                        setSheetHash(null);
                    }
                } else if (msg && msg.type === 'themes-sheet-create-template-response') {
                    setCreatingSheet(false);
                    if (msg.ok) {
                        setHasThemesSheet(true);
                    }
                    // Request status again after creation
                    try {
                        Office.context.ui.messageParent(
                            JSON.stringify({ type: 'themes-sheet-status-request' }),
                        );
                    } catch {}
                } else if (msg && msg.type === 'themes-sheet-read-response') {
                    if (msg.error) {
                        setImporting(false);
                        return;
                    }
                    const themes = Array.isArray(msg.themes) ? (msg.themes as Theme[]) : [];
                    setThemeSets((prev) => {
                        const shortThemes: ShortTheme[] = themes.map((t) => ({
                            label: String(t.label || ''),
                            representatives: Array.isArray(t.representatives)
                                ? t.representatives.map((r: any) => String(r))
                                : [],
                        }));
                        const base = 'Themes (Sheet)';
                        let name = base;
                        let i = 2;
                        const names = new Set(prev.map((s) => s.name));
                        while (names.has(name)) {
                            name = `${base} ${i++}`;
                        }
                        return [...prev, { name, themes: shortThemes }];
                    });
                    setImporting(false);
                    // Refresh status to compute new matching
                    try {
                        Office.context.ui.messageParent(
                            JSON.stringify({ type: 'themes-sheet-status-request' }),
                        );
                    } catch {}
                }
            } catch {}
        };
        try {
            Office.context.ui.addHandlerAsync(
                Office.EventType.DialogParentMessageReceived,
                handler,
            );
        } catch {}
        // No remove API available here; rely on single registration during component lifetime
    }, []);

    // Request initial status on mount
    useEffect(() => {
        try {
            Office.context.ui.messageParent(
                JSON.stringify({ type: 'themes-sheet-status-request' }),
            );
        } catch {}
    }, []);

    const importDisabled = !hasThemesSheet || !!matchedSetName || importing;
    const createSheetDisabled = creatingSheet || hasThemesSheet;

    const goToList = () => {
        setView('list');
        setSelected(null);
    };
    const handleCreate = () => setView('create');
    const handleView = (ts: ThemeSet) => {
        setSelected(ts);
        setView('detail');
    };
    const handleEdit = () => setView('edit');
    const handleDelete = (ts: ThemeSet) => setConfirmDelete(ts);
    const handleCancelDelete = () => setConfirmDelete(null);
    const handleConfirmDelete = () => {
        if (confirmDelete) {
            setThemeSets(
                themeSets.filter((ts) => ts.name !== confirmDelete.name),
            );
            if (selected?.name === confirmDelete.name) {
                goToList();
            }
            setConfirmDelete(null);
        }
    };
    const handleSave = (ts: ThemeSet) => {
        const idx = themeSets.findIndex((t) => t.name === ts.name);
        if (idx >= 0) {
            const updated = [...themeSets];
            updated[idx] = ts;
            setThemeSets(updated);
        } else {
            setThemeSets([...themeSets, ts]);
        }
        goToList();
    };

    let content = null;
    if (view === 'list') {
        content = (
            <ThemeSetList
                themeSets={themeSets}
                onCreate={handleCreate}
                onView={handleView}
                onDelete={handleDelete}
                onImportFromSheet={async () => {
                    try {
                        setImporting(true);
                        Office.context.ui.messageParent(
                            JSON.stringify({ type: 'themes-sheet-read-request' }),
                        );
                    } catch (e) {
                        console.error('Failed to request themes from parent', e);
                        setImporting(false);
                    }
                }}
                onCreateSheetTemplate={async () => {
                    try {
                        setCreatingSheet(true);
                        Office.context.ui.messageParent(
                            JSON.stringify({ type: 'themes-sheet-create-template-request' }),
                        );
                    } catch (e) {
                        console.error('Failed to request template creation', e);
                        setCreatingSheet(false);
                    }
                }}
                importDisabled={importDisabled}
                createSheetDisabled={createSheetDisabled}
                sheetSetName={matchedSetName || undefined}
            />
        );
    } else if (view === 'create') {
        content = <ThemeSetForm onSave={handleSave} onCancel={goToList} />;
    } else if (view === 'detail' && selected) {
        content = (
            <ThemeSetDetail
                themeSet={selected}
                onEdit={handleEdit}
                onDelete={() => handleDelete(selected)}
                onBack={goToList}
            />
        );
    } else if (view === 'edit' && selected) {
        content = (
            <ThemeSetForm
                initialData={selected}
                onSave={handleSave}
                onCancel={goToList}
            />
        );
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                }}
            >
                <h2 className="text-2xl font-semibold">Theme Sets</h2>
            </div>
            {content}
            <Dialog
                hidden={!confirmDelete}
                onDismiss={handleCancelDelete}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Confirm Delete',
                    subText: `Are you sure you want to delete "${confirmDelete?.name}"?`,
                }}
                modalProps={{ isBlocking: true }}
            >
                <DialogFooter>
                    <PrimaryButton
                        text="Delete"
                        onClick={handleConfirmDelete}
                    />
                    <DefaultButton text="Cancel" onClick={handleCancelDelete} />
                </DialogFooter>
            </Dialog>
        </div>
    );
}
