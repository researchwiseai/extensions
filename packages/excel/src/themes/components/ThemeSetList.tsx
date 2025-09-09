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
    onImportFromSheet?: () => void;
    onCreateSheetTemplate?: () => void;
    importDisabled?: boolean;
    createSheetDisabled?: boolean;
    sheetSetName?: string;
}

export const ThemeSetList: React.FC<ThemeSetListProps> = ({
    themeSets,
    onCreate,
    onView,
    onDelete,
    onImportFromSheet,
    onCreateSheetTemplate,
    importDisabled,
    createSheetDisabled,
    sheetSetName,
}) => {
    const columns: IColumn[] = [
        {
            key: 'name',
            name: 'Name',
            fieldName: 'name',
            minWidth: 200,
            maxWidth: 350,
            isResizable: true,
            onRender: (item: ThemeSet) => (
                <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    {sheetSetName && sheetSetName === item.name ? (
                        <span
                            title="This set matches the Themes worksheet"
                            style={{
                                background: '#E0F2F1',
                                color: '#00695C',
                                border: '1px solid #26A69A',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontSize: 11,
                                lineHeight: '16px',
                            }}
                        >
                            On Sheet
                        </span>
                    ) : null}
                </div>
            ),
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
            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <DefaultButton text="Create Theme Set" onClick={onCreate} />
                <DefaultButton
                    text="Import from Themes Sheet"
                    onClick={onImportFromSheet}
                    disabled={importDisabled}
                />
                <DefaultButton
                    text="Create Themes Sheet Template"
                    onClick={onCreateSheetTemplate}
                    disabled={createSheetDisabled}
                />
            </Stack>
            <DetailsList
                selectionMode={SelectionMode.none}
                compact={true}
                items={themeSets}
                columns={columns}
            />
        </Stack>
    );
};
