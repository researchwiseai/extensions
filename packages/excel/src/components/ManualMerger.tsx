import React, { useState, useCallback } from 'react';
import {
    Stack,
    Text,
    PrimaryButton,
    DefaultButton,
    TextField,
    Checkbox,
    MessageBar,
    MessageBarType,
    IStackTokens,
    Selection,
    SelectionMode,
    DetailsList,
    IColumn,
    DetailsListLayoutMode,
    IDetailsListProps,
} from '@fluentui/react';
import { DictionaryItem, MergerGroup } from 'pulse-common';

export interface ManualMergerProps {
    availableItems: DictionaryItem[];
    onCreateMerger: (merger: MergerGroup) => void;
    onCancel: () => void;
}

interface ManualMergerItem extends DictionaryItem {
    key: string;
    isSelected: boolean;
}

const stackTokens: IStackTokens = {
    childrenGap: 12,
};

const listStackTokens: IStackTokens = {
    childrenGap: 8,
};

export function ManualMerger({
    availableItems,
    onCreateMerger,
    onCancel,
}: ManualMergerProps) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [customName, setCustomName] = useState<string>('');
    const [nameError, setNameError] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);

    // Convert dictionary items to list items
    const listItems: ManualMergerItem[] = availableItems.map((item, index) => ({
        ...item,
        key: `item_${index}`,
        isSelected: selectedItems.has(item.name),
    }));

    // Define columns for the details list
    const columns: IColumn[] = [
        {
            key: 'selection',
            name: '',
            fieldName: 'isSelected',
            minWidth: 32,
            maxWidth: 32,
            onRender: (item: ManualMergerItem) => (
                <Checkbox
                    checked={item.isSelected}
                    onChange={(_, checked) => handleItemSelection(item.name, checked || false)}
                    ariaLabel={`Select ${item.name}`}
                />
            ),
        },
        {
            key: 'name',
            name: 'Dictionary Item',
            fieldName: 'name',
            minWidth: 200,
            maxWidth: 300,
            isResizable: true,
            onRender: (item: ManualMergerItem) => (
                <Text variant="medium" styles={{ root: { fontWeight: item.isSelected ? 600 : 400 } }}>
                    {item.name}
                </Text>
            ),
        },
        {
            key: 'extractionCount',
            name: 'Extractions',
            fieldName: 'extractionCount',
            minWidth: 80,
            maxWidth: 100,
            isResizable: true,
            onRender: (item: ManualMergerItem) => (
                <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                    {item.extractionCount}
                </Text>
            ),
        },
        {
            key: 'cellReferences',
            name: 'Cell References',
            fieldName: 'cellReferences',
            minWidth: 150,
            isResizable: true,
            onRender: (item: ManualMergerItem) => (
                <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                    {item.cellReferences.slice(0, 3).join(', ')}
                    {item.cellReferences.length > 3 && ` +${item.cellReferences.length - 3} more`}
                </Text>
            ),
        },
    ];

    const handleItemSelection = useCallback((itemName: string, isSelected: boolean) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(itemName);
            } else {
                newSet.delete(itemName);
            }
            return newSet;
        });

        // Clear name error when selection changes
        if (nameError) {
            setNameError('');
        }
    }, [nameError]);

    const handleSelectAll = useCallback(() => {
        const allNames = new Set(availableItems.map(item => item.name));
        setSelectedItems(allNames);
    }, [availableItems]);

    const handleClearAll = useCallback(() => {
        setSelectedItems(new Set());
    }, []);

    const validateCustomName = useCallback((name: string): string => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            return 'Merger name is required';
        }

        if (trimmedName.length < 2) {
            return 'Merger name must be at least 2 characters long';
        }

        if (trimmedName.length > 100) {
            return 'Merger name must be less than 100 characters';
        }

        // Check if name conflicts with existing items (excluding selected ones)
        const unselectedItems = availableItems.filter(item => !selectedItems.has(item.name));
        if (unselectedItems.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
            return 'Merger name conflicts with an existing dictionary item';
        }

        return '';
    }, [availableItems, selectedItems]);

    const handleCustomNameChange = useCallback((
        event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
        newValue?: string
    ) => {
        const value = newValue || '';
        setCustomName(value);

        // Validate name in real-time
        const error = validateCustomName(value);
        setNameError(error);
    }, [validateCustomName]);

    const handleCreateMerger = useCallback(async () => {
        if (selectedItems.size < 2) {
            setNameError('Please select at least 2 items to merge');
            return;
        }

        const nameValidationError = validateCustomName(customName);
        if (nameValidationError) {
            setNameError(nameValidationError);
            return;
        }

        setIsCreating(true);

        try {
            // Get the selected dictionary items
            const selectedDictionaryItems = availableItems.filter(item =>
                selectedItems.has(item.name)
            );

            // Create the merger group
            const merger: MergerGroup = {
                id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                items: selectedDictionaryItems,
                finalName: customName.trim(),
                type: 'manual',
            };

            onCreateMerger(merger);
        } catch (error) {
            console.error('Failed to create manual merger:', error);
            setNameError(
                error instanceof Error
                    ? error.message
                    : 'Failed to create merger'
            );
        } finally {
            setIsCreating(false);
        }
    }, [selectedItems, customName, validateCustomName, availableItems, onCreateMerger]);

    const getSelectedItemsText = () => {
        if (selectedItems.size === 0) return 'No items selected';
        if (selectedItems.size === 1) return '1 item selected';
        return `${selectedItems.size} items selected`;
    };

    const getSuggestedName = () => {
        if (selectedItems.size === 0) return '';

        // Find the item with the highest extraction count among selected items
        const selectedDictionaryItems = availableItems.filter(item =>
            selectedItems.has(item.name)
        );

        if (selectedDictionaryItems.length === 0) return '';

        const mostCommon = selectedDictionaryItems.reduce((prev, current) =>
            current.extractionCount > prev.extractionCount ? current : prev
        );

        return mostCommon.name;
    };

    const handleUseSuggested = () => {
        const suggested = getSuggestedName();
        if (suggested) {
            setCustomName(suggested);
            setNameError('');
        }
    };

    return (
        <Stack tokens={stackTokens} styles={{ root: { height: '100%' } }}>
            {/* Header */}
            <Stack tokens={{ childrenGap: 8 }}>
                <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
                    Create Manual Merger
                </Text>
                <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                    Select multiple dictionary items to merge them into a single entity.
                </Text>
            </Stack>

            {/* Selection controls */}
            <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                    {getSelectedItemsText()}
                </Text>
                <DefaultButton
                    text="Select All"
                    onClick={handleSelectAll}
                    disabled={availableItems.length === 0}
                    styles={{ root: { minWidth: 80 } }}
                />
                <DefaultButton
                    text="Clear All"
                    onClick={handleClearAll}
                    disabled={selectedItems.size === 0}
                    styles={{ root: { minWidth: 80 } }}
                />
            </Stack>

            {/* Dictionary items list */}
            <Stack tokens={listStackTokens} styles={{ root: { flex: 1, minHeight: 200 } }}>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                    Available Dictionary Items ({availableItems.length})
                </Text>

                {availableItems.length === 0 ? (
                    <MessageBar messageBarType={MessageBarType.info}>
                        No dictionary items available for manual merging.
                    </MessageBar>
                ) : (
                    <div style={{ height: '300px', overflow: 'auto', border: '1px solid #d1d1d1' }}>
                        <DetailsList
                            items={listItems}
                            columns={columns}
                            layoutMode={DetailsListLayoutMode.justified}
                            selectionMode={SelectionMode.none}
                            isHeaderVisible={true}
                            compact={true}
                        />
                    </div>
                )}
            </Stack>

            {/* Custom name input */}
            <Stack tokens={{ childrenGap: 8 }}>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                    Merger Name
                </Text>

                {selectedItems.size > 0 && (
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                        <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                            Suggested: {getSuggestedName()}
                        </Text>
                        <DefaultButton
                            text="Use Suggested"
                            onClick={handleUseSuggested}
                            disabled={!getSuggestedName() || customName === getSuggestedName()}
                            styles={{ root: { minWidth: 100 } }}
                        />
                    </Stack>
                )}

                <TextField
                    placeholder="Enter a name for the merged entity"
                    value={customName}
                    onChange={handleCustomNameChange}
                    errorMessage={nameError}
                    disabled={selectedItems.size < 2}
                    maxLength={100}
                    description={
                        selectedItems.size < 2
                            ? "Select at least 2 items to enable naming"
                            : `This will be the final name used for all ${selectedItems.size} selected items`
                    }
                />
            </Stack>

            {/* Action buttons */}
            <Stack
                horizontal
                tokens={{ childrenGap: 8 }}
                horizontalAlign="end"
                styles={{ root: { marginTop: 'auto', paddingTop: 16 } }}
            >
                <DefaultButton
                    text="Cancel"
                    onClick={onCancel}
                    disabled={isCreating}
                    styles={{ root: { minWidth: 100 } }}
                />
                <PrimaryButton
                    text="Create Merger"
                    onClick={handleCreateMerger}
                    disabled={
                        selectedItems.size < 2 ||
                        !customName.trim() ||
                        !!nameError ||
                        isCreating
                    }
                    styles={{ root: { minWidth: 120 } }}
                />
            </Stack>
        </Stack>
    );
}