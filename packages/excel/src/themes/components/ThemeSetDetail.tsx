import React from 'react';
import { Stack, Text, PrimaryButton, DefaultButton } from '@fluentui/react';
import { ThemeSet } from 'pulse-common/themes';

interface ThemeSetDetailProps {
    themeSet: ThemeSet;
    onEdit: () => void;
    onDelete: () => void;
    onBack: () => void;
}

export const ThemeSetDetail: React.FC<ThemeSetDetailProps> = ({
    themeSet,
    onEdit,
    onDelete,
    onBack,
}) => {
    return (
        <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 16 } }}>
            <Text variant="xLarge">{themeSet.name}</Text>
            <Stack tokens={{ childrenGap: 8 }}>
                {themeSet.themes.map((theme, index) => (
                    <Stack horizontal tokens={{ childrenGap: 8 }} key={index}>
                        <Text>{theme.label}</Text>
                        <Text>{theme.representatives[0]}</Text>
                        <Text>{theme.representatives[1]}</Text>
                    </Stack>
                ))}
            </Stack>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton text="Edit" onClick={onEdit} />
                <DefaultButton text="Delete" onClick={onDelete} />
                <DefaultButton text="Back" onClick={onBack} />
            </Stack>
        </Stack>
    );
};
