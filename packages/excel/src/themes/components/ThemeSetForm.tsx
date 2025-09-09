import React, { useState } from 'react';
import {
    Stack,
    TextField,
    DefaultButton,
    PrimaryButton,
    IconButton,
    Label,
} from '@fluentui/react';
import { ShortTheme, ThemeSet } from 'pulse-common/themes';
import { Theme } from 'pulse-common/api';

interface ThemeSetFormProps {
    initialData?: ThemeSet;
    onSave: (themeSet: ThemeSet<ShortTheme | Theme>) => void;
    onCancel: () => void;
}

export const ThemeSetForm: React.FC<ThemeSetFormProps> = ({
    initialData,
    onSave,
    onCancel,
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [themes, setThemes] = useState<ShortTheme[]>(
        initialData?.themes?.length
            ? initialData.themes
            : [{ label: '', representatives: ['', ''] }],
    );

    const handleNameChange = (_: any, newValue?: string) => {
        setName(newValue || '');
    };

    const handleThemeChange =
        (themeIndex: number, field: keyof ShortTheme, repIndex?: number) =>
        (_: any, newValue?: string) => {
            const updatedThemes = [...themes];
            const themeToUpdate = { ...updatedThemes[themeIndex] };

            if (field === 'representatives' && typeof repIndex === 'number') {
                const newReps = [...themeToUpdate.representatives];
                newReps[repIndex] = newValue || '';
                themeToUpdate.representatives = newReps;
            } else if (field === 'label') {
                themeToUpdate.label = newValue || '';
            }

            updatedThemes[themeIndex] = themeToUpdate;
            setThemes(updatedThemes);
        };

    const addTheme = () => {
        setThemes([...themes, { label: '', representatives: ['', ''] }]);
    };

    const removeTheme = (index: number) => {
        const updated = [...themes];
        updated.splice(index, 1);
        setThemes(updated);
    };

    const addRepresentative = (themeIndex: number) => {
        const updatedThemes = [...themes];
        const theme = updatedThemes[themeIndex];
        if (theme.representatives.length < 10) {
            theme.representatives.push('');
            setThemes(updatedThemes);
        }
    };

    const removeRepresentative = (themeIndex: number, repIndex: number) => {
        const updatedThemes = [...themes];
        const theme = updatedThemes[themeIndex];
        if (theme.representatives.length > 2) {
            theme.representatives.splice(repIndex, 1);
            setThemes(updatedThemes);
        }
    };

    const handleSubmit = () => {
        onSave({ name, themes });
    };

    return (
        <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 16 } }}>
            <TextField
                label="Theme Set Name"
                value={name}
                onChange={handleNameChange}
                required
            />
            <Stack tokens={{ childrenGap: 24 }}>
                {themes.map((theme, themeIndex) => (
                    <Stack
                        key={themeIndex}
                        tokens={{ childrenGap: 8 }}
                        styles={{
                            root: {
                                border: '1px solid #ccc',
                                padding: 12,
                                position: 'relative',
                            },
                        }}
                    >
                        <IconButton
                            iconProps={{ iconName: 'Delete' }}
                            ariaLabel="Remove theme"
                            onClick={() => removeTheme(themeIndex)}
                            styles={{
                                root: {
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                },
                            }}
                        />
                        <TextField
                            label="Theme Label"
                            value={theme.label}
                            onChange={handleThemeChange(themeIndex, 'label')}
                        />
                        <Label>Examples</Label>
                        {theme.representatives.map((rep, repIndex) => (
                            <Stack
                                horizontal
                                key={repIndex}
                                tokens={{ childrenGap: 8 }}
                                verticalAlign="end"
                            >
                                <Stack.Item grow>
                                    <TextField
                                        label={`Example ${repIndex + 1}`}
                                        value={rep}
                                        onChange={handleThemeChange(
                                            themeIndex,
                                            'representatives',
                                            repIndex,
                                        )}
                                    />
                                </Stack.Item>
                                <IconButton
                                    iconProps={{ iconName: 'Delete' }}
                                    ariaLabel="Remove example"
                                    onClick={() =>
                                        removeRepresentative(
                                            themeIndex,
                                            repIndex,
                                        )
                                    }
                                    disabled={theme.representatives.length <= 2}
                                />
                            </Stack>
                        ))}
                        <DefaultButton
                            className="pulse-btn pulse-btn--secondary"
                            text="Add Example"
                            onClick={() => addRepresentative(themeIndex)}
                            disabled={theme.representatives.length >= 10}
                        />
                    </Stack>
                ))}
            </Stack>
            <DefaultButton className="pulse-btn pulse-btn--secondary" text="Add Theme" onClick={addTheme} />
            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton
                    className="pulse-btn pulse-btn--primary"
                    text="Save"
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                />
                <DefaultButton className="pulse-btn pulse-btn--secondary" text="Cancel" onClick={onCancel} />
            </Stack>
        </Stack>
    );
};
