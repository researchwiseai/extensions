import { useEffect, useState } from 'react';
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

export function ThemeSetManager() {
    const [view, setView] = useState<'list' | 'create' | 'detail' | 'edit'>(
        'list',
    );
    const [themeSets, setThemeSets] = useState<ThemeSet<ShortTheme>[]>([]);
    const [selected, setSelected] = useState<ThemeSet | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<ThemeSet | null>(null);

    useEffect(() => {
        getThemeSets().then((sets) => {
            console.log('Theme sets loaded', sets);
            setThemeSets(sets);
        });
    }, []);

    useEffect(() => {
        saveAllThemeSets(themeSets);
    }, [themeSets]);

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
