import React from 'react';
import {
    DetailsList,
    IColumn,
    DefaultButton,
    IconButton,
    Stack,
    SelectionMode,
} from '@fluentui/react';
import { ShortTheme, ThemeSet } from 'pulse-common/themes';
import { Theme } from 'pulse-common/api';

interface ThemeSetListProps {
    themeSets: ThemeSet<ShortTheme | Theme>[];
    onCreate: () => void;
    onView: (themeSet: ThemeSet) => void;
    onDelete: (themeSet: ThemeSet) => void;
}

export const ThemeSetList: React.FC<ThemeSetListProps> = ({
    themeSets,
    onCreate,
    onView,
    onDelete,
}) => {
    const columns: IColumn[] = [
        {
            key: 'name',
            name: 'Name',
            fieldName: 'name',
            minWidth: 200,
            maxWidth: 350,
            isResizable: true,
        },
        {
            key: 'actions',
            name: 'Actions',
            fieldName: 'actions',
            minWidth: 100,
            onRender: (item: ThemeSet) => (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                    <IconButton
                        iconProps={{ iconName: 'View' }}
                        title="View"
                        ariaLabel="View"
                        onClick={() => onView(item)}
                    />
                    <IconButton
                        iconProps={{ iconName: 'Delete' }}
                        title="Delete"
                        ariaLabel="Delete"
                        onClick={() => onDelete(item)}
                    />
                </Stack>
            ),
        },
    ];

    return (
        <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 16 } }}>
            <DefaultButton text="Create Theme Set" onClick={onCreate} />
            <DetailsList
                selectionMode={SelectionMode.none}
                compact={true}
                items={themeSets}
                columns={columns}
            />
        </Stack>
    );
};
