import React, { useState } from 'react';
import {
    Stack,
    TextField,
    DefaultButton,
    PrimaryButton,
    IconButton,
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
        initialData?.themes || [{ label: '', representatives: ['', ''] }],
    );

    const handleNameChange = (_: any, newValue?: string) => {
        setName(newValue || '');
    };

    const handleThemeChange =
        (index: number, field: keyof Theme, fieldIndex?: number) =>
        (_: any, newValue?: string) => {
            const updated = [...themes];
            if (
                typeof fieldIndex === 'number' &&
                Array.isArray(updated[index][field])
            ) {
                const fieldArr = [...updated[index][field]];
                fieldArr[fieldIndex] = newValue || '';
                updated[index] = { ...updated[index], [field]: fieldArr };
            } else {
                updated[index] = { ...updated[index], [field]: newValue || '' };
            }
            setThemes(updated);
        };

    const addTheme = () => {
        setThemes([...themes, { label: '', representatives: ['', ''] }]);
    };

    const removeTheme = (index: number) => {
        const updated = [...themes];
        updated.splice(index, 1);
        setThemes(updated);
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
            <Stack tokens={{ childrenGap: 8 }}>
                {themes.map((theme, index) => (
                    <Stack
                        horizontal
                        tokens={{ childrenGap: 8 }}
                        verticalAlign="end"
                        key={index}
                    >
                        <TextField
                            label="Label"
                            value={theme.label}
                            onChange={handleThemeChange(index, 'label')}
                        />
                        <TextField
                            label="Example 1"
                            value={theme.representatives[0]}
                            onChange={handleThemeChange(
                                index,
                                'representatives',
                                0,
                            )}
                        />
                        <TextField
                            label="Example 2"
                            value={theme.representatives[1]}
                            onChange={handleThemeChange(
                                index,
                                'representatives',
                                1,
                            )}
                        />
                        <IconButton
                            iconProps={{ iconName: 'Delete' }}
                            ariaLabel="Remove theme"
                            onClick={() => removeTheme(index)}
                        />
                    </Stack>
                ))}
            </Stack>
            <DefaultButton text="Add Theme" onClick={addTheme} />
            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton
                    text="Save"
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                />
                <DefaultButton text="Cancel" onClick={onCancel} />
            </Stack>
        </Stack>
    );
};
