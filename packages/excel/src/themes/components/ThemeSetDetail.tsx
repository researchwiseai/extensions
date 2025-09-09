import React, { useState } from 'react';
import {
    Stack,
    Text,
    PrimaryButton,
    DefaultButton,
    DetailsList,
    DetailsRow,
    IColumn,
    IDetailsRowProps,
    SelectionMode,
    DetailsListLayoutMode,
    Dialog,
    DialogType,
    DialogFooter,
    Link,
} from '@fluentui/react';
import { ThemeSet } from 'pulse-common/themes';
import { Theme } from 'pulse-common/api';

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
    const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
    // Prepare columns for the themes table (hidden index column for item lookup)
    const columns: IColumn[] = [
        {
            key: 'label',
            name: 'Label',
            fieldName: 'label',
            minWidth: 150,
            isResizable: true,
            onRender(item, index) {
                return (
                    <Link
                        onClick={() =>
                            setSelectedTheme(themeSet.themes[index] as Theme)
                        }
                    >
                        {item.label}
                    </Link>
                );
            },
        },
    ];

    if (themeSet.themes.length > 0) {
        themeSet.themes[0].representatives.forEach((_, idx) => {
            columns.push({
                key: `rep${idx}`,
                name: `Representative ${idx + 1}`,
                fieldName: `rep${idx}`,
                minWidth: 100,
                isResizable: true,
            });
        });
    }
    // Map themes to items for DetailsList (keep index for lookup)
    const items = themeSet.themes.map((theme, index) => {
        const item: Record<string, any> = { index, label: theme.label };
        theme.representatives.forEach((rep, idx) => {
            item[`rep${idx}`] = rep;
        });
        return item;
    });
    // Render rows with single-click and pointer cursor
    const onRenderRow = (props?: IDetailsRowProps) => {
        if (!props) return null;
        return <DetailsRow {...props} />;
    };
    return (
        <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 16 } }}>
            <Text variant="xLarge">{themeSet.name}</Text>
            <DetailsList
                items={items}
                columns={columns}
                selectionMode={SelectionMode.none}
                layoutMode={DetailsListLayoutMode.justified}
                onRenderRow={onRenderRow}
                onItemInvoked={(_, index) =>
                    setSelectedTheme(themeSet.themes[index] as Theme)
                }
            />
            {/* Theme detail dialog on row click */}
            {selectedTheme && (
                <Dialog
                    hidden={false}
                    onDismiss={() => setSelectedTheme(null)}
                    dialogContentProps={{
                        type: DialogType.largeHeader,
                        title: selectedTheme.label,
                        subText: selectedTheme.shortLabel,
                    }}
                    modalProps={{
                        isBlocking: false,
                        styles: {
                            main: { width: '90%' },
                            root: { width: '100%' },
                        },
                    }}
                    minWidth={'80%'}
                >
                    <Stack
                        tokens={{ childrenGap: 16, padding: 16 }}
                        styles={{ root: { padding: 16 } }}
                    >
                        <Text variant="mediumPlus">Description</Text>
                        <Text>{selectedTheme.description}</Text>
                        <Text variant="mediumPlus">Representatives</Text>
                        <Stack tokens={{ childrenGap: 8 }}>
                            {selectedTheme.representatives.map((rep, i) => (
                                <Text key={i}>• {rep}</Text>
                            ))}
                        </Stack>
                        <DialogFooter>
                            <PrimaryButton
                                text="Close"
                                onClick={() => setSelectedTheme(null)}
                            />
                        </DialogFooter>
                    </Stack>
                </Dialog>
            )}
            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton className="pulse-btn pulse-btn--primary" text="Edit" onClick={onEdit} />
                <DefaultButton className="pulse-btn pulse-btn--danger" text="Delete" onClick={onDelete} />
                <DefaultButton className="pulse-btn pulse-btn--secondary" text="Back" onClick={onBack} />
            </Stack>
        </Stack>
    );
};
