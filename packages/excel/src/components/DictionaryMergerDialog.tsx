import React, { useState, useEffect, useMemo } from 'react';
import {
    Stack,
    Text,
    PrimaryButton,
    DefaultButton,
    Spinner,
    SpinnerSize,
    MessageBar,
    MessageBarType,
    IStackTokens,
    Pivot,
    PivotItem,
    Dialog,
    DialogType,
    DialogFooter,
    ProgressIndicator,
    Icon,
    Checkbox,
} from '@fluentui/react';
import {
    MergerResult,
    MergerSuggestion,
    MergerGroup,
    DictionaryMerger,
    FuzzyMatchOptions,
    DictionaryItem,
} from 'pulse-common';
import { AutomaticSuggestions } from './AutomaticSuggestions';
import { ManualMerger } from './ManualMerger';

export interface DictionaryMergerDialogProps {
    dictionary: string[];
    extractions: string[][];
    onComplete: (result: MergerResult | null) => void;
    autoGroupRareEntities?: boolean; // Optional prop for auto-grouping
}

const stackTokens: IStackTokens = {
    childrenGap: 16,
};

type WorkflowStep = 'suggestions' | 'manual' | 'confirmation';

export function DictionaryMergerDialog({
    dictionary,
    extractions,
    onComplete,
    autoGroupRareEntities = false,
}: DictionaryMergerDialogProps) {
    // Early validation of props
    if (!dictionary || !Array.isArray(dictionary)) {
        console.error('DictionaryMergerDialog: Invalid dictionary prop', dictionary);
        onComplete(null);
        return <div>Error: Invalid dictionary data</div>;
    }

    if (!extractions || !Array.isArray(extractions)) {
        console.error('DictionaryMergerDialog: Invalid extractions prop', extractions);
        onComplete(null);
        return <div>Error: Invalid extractions data</div>;
    }
    const [suggestions, setSuggestions] = useState<MergerSuggestion[]>([]);
    const [appliedMergers, setAppliedMergers] = useState<MergerGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('suggestions');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [progressPercentage, setProgressPercentage] = useState<number>(0);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [enableAutoGrouping, setEnableAutoGrouping] = useState(autoGroupRareEntities);

    const dictionaryMerger = new DictionaryMerger();

    // Create dictionary items with extraction counts
    const dictionaryItems = useMemo((): DictionaryItem[] => {
        const items: Record<string, DictionaryItem> = {};

        // Initialize items
        for (const name of dictionary) {
            items[name] = {
                name,
                extractionCount: 0,
                cellReferences: [],
            };
        }

        // Count extractions and track cell references
        for (let rowIndex = 0; rowIndex < extractions.length; rowIndex++) {
            const row = extractions[rowIndex];
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const item = row[colIndex];
                if (items[item]) {
                    items[item].extractionCount++;
                    items[item].cellReferences.push(
                        `R${rowIndex + 1}C${colIndex + 1}`,
                    );
                }
            }
        }

        return Object.values(items);
    }, [dictionary, extractions]);

    // Get available items for manual merger (excluding already merged items)
    const availableItemsForManual = useMemo((): DictionaryItem[] => {
        const mergedItemNames = new Set<string>();
        appliedMergers.forEach(merger => {
            merger.items.forEach(item => {
                mergedItemNames.add(item.name);
            });
        });

        return dictionaryItems.filter(item => !mergedItemNames.has(item.name));
    }, [dictionaryItems, appliedMergers]);

    // Generate suggestions on component mount
    useEffect(() => {
        const generateSuggestions = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setIsRetrying(retryCount > 0);
                setProgressPercentage(0);
                setShowSuccessMessage(false);

                // Progress tracking
                setProgressMessage('Validating input data...');
                setProgressPercentage(10);

                // Validate input data
                if (!Array.isArray(dictionary) || dictionary.length === 0) {
                    throw new Error('Invalid dictionary data: Dictionary must be a non-empty array');
                }

                if (!Array.isArray(extractions) || extractions.length === 0) {
                    throw new Error('Invalid extraction data: Extractions must be a non-empty array');
                }

                // Validate extraction structure
                const invalidExtractions = extractions.some(row => !Array.isArray(row));
                if (invalidExtractions) {
                    throw new Error('Invalid extraction data: All extraction rows must be arrays');
                }

                setProgressMessage('Preparing fuzzy matching analysis...');
                setProgressPercentage(25);

                const options: Partial<FuzzyMatchOptions> = {
                    threshold: 0.6,
                    maxSuggestions: 10,
                    timeout: retryCount > 0 ? 10000 : 5000, // Longer timeout on retry
                    autoGroupRareEntities: enableAutoGrouping,
                    rareEntityThreshold: 0.005, // 0.5%
                };

                setProgressMessage(`Analyzing ${dictionary.length} dictionary items for similarities...`);
                setProgressPercentage(50);

                const generatedSuggestions = await dictionaryMerger.generateSuggestions(
                    dictionary,
                    extractions,
                    options
                );

                setProgressMessage('Processing suggestions...');
                setProgressPercentage(90);

                // Small delay to show completion
                await new Promise(resolve => setTimeout(resolve, 200));

                setSuggestions(generatedSuggestions);
                setRetryCount(0); // Reset retry count on success

                // Auto-accept any 'auto_other' suggestions
                const autoOtherSuggestions = generatedSuggestions.filter(
                    suggestion => suggestion.reason === 'auto_other'
                );

                if (autoOtherSuggestions.length > 0) {
                    const autoMergers: MergerGroup[] = autoOtherSuggestions.map(suggestion => ({
                        id: suggestion.id,
                        items: suggestion.items,
                        finalName: suggestion.suggestedName,
                        type: 'automatic',
                    }));

                    setAppliedMergers(prev => [...prev, ...autoMergers]);
                }

                setProgressMessage('Analysis complete!');
                setProgressPercentage(100);
                setShowSuccessMessage(true);

                // Hide success message after a delay
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    setProgressMessage('');
                    setProgressPercentage(0);
                }, 2000);
            } catch (err) {
                console.error('Failed to generate merger suggestions:', err);

                let errorMessage = 'Failed to generate merger suggestions';

                if (err instanceof Error) {
                    if (err.message.includes('timeout')) {
                        errorMessage = 'Suggestion generation timed out. The dictionary may be too large or complex.';
                    } else if (err.message.includes('Invalid')) {
                        errorMessage = err.message;
                    } else if (err.message.includes('memory') || err.message.includes('Memory')) {
                        errorMessage = 'Insufficient memory to process the dictionary. Try with a smaller dataset.';
                    } else {
                        errorMessage = `Suggestion generation failed: ${err.message}`;
                    }
                }

                setError(errorMessage);
            } finally {
                setIsLoading(false);
                setIsRetrying(false);
                if (!showSuccessMessage) {
                    setProgressMessage('');
                    setProgressPercentage(0);
                }
            }
        };

        generateSuggestions();
    }, [dictionary, extractions, retryCount, enableAutoGrouping]);

    const handleAcceptSuggestion = (suggestion: MergerSuggestion, finalName?: string) => {
        const mergerGroup: MergerGroup = {
            id: suggestion.id,
            items: suggestion.items,
            finalName: finalName || suggestion.suggestedName,
            type: 'automatic',
        };

        setAppliedMergers(prev => [...prev, mergerGroup]);
    };

    const handleRejectSuggestion = (suggestion: MergerSuggestion) => {
        // Remove from applied mergers if it was previously accepted
        setAppliedMergers(prev => prev.filter(merger => merger.id !== suggestion.id));
    };

    const handleModifySuggestion = (suggestion: MergerSuggestion, finalName: string) => {
        const mergerGroup: MergerGroup = {
            id: suggestion.id,
            items: suggestion.items,
            finalName: finalName,
            type: 'automatic',
        };

        setAppliedMergers(prev => {
            const filtered = prev.filter(merger => merger.id !== suggestion.id);
            return [...filtered, mergerGroup];
        });
    };

    const handleCreateManualMerger = (merger: MergerGroup) => {
        setAppliedMergers(prev => [...prev, merger]);
        // Switch back to suggestions tab to show the updated state
        setCurrentStep('suggestions');
    };

    const handleRemoveMerger = (mergerId: string) => {
        setAppliedMergers(prev => prev.filter(merger => merger.id !== mergerId));
    };

    const handleCancel = () => {
        onComplete(null);
    };

    const handleProceedToConfirmation = () => {
        if (appliedMergers.length === 0) {
            // No mergers to apply, complete directly
            handleComplete();
        } else {
            setShowConfirmDialog(true);
        }
    };

    const handleComplete = async () => {
        if (appliedMergers.length === 0) {
            // No mergers to apply, return original data
            onComplete({
                mergedDictionary: dictionary,
                mergedExtractions: extractions,
                appliedMergers: [],
            });
            return;
        }

        try {
            setIsProcessing(true);
            setError(null);
            setProgressPercentage(0);
            setShowSuccessMessage(false);

            setProgressMessage('Validating merger configuration...');
            setProgressPercentage(10);

            // Validate mergers before applying
            const invalidMergers = appliedMergers.filter(merger =>
                !merger.items || merger.items.length < 2 || !merger.finalName?.trim()
            );

            if (invalidMergers.length > 0) {
                throw new Error(`Invalid merger configuration: ${invalidMergers.length} merger(s) have invalid data`);
            }

            // Check for duplicate final names
            const finalNames = appliedMergers.map(m => m.finalName.toLowerCase());
            const duplicateNames = finalNames.filter((name, index) => finalNames.indexOf(name) !== index);
            if (duplicateNames.length > 0) {
                throw new Error(`Duplicate merger names detected: ${duplicateNames.join(', ')}`);
            }

            setProgressMessage(`Applying ${appliedMergers.length} merger${appliedMergers.length !== 1 ? 's' : ''}...`);
            setProgressPercentage(40);

            const result = dictionaryMerger.applyMergers(
                dictionary,
                extractions,
                appliedMergers
            );

            setProgressMessage('Validating merged results...');
            setProgressPercentage(80);

            // Validate the result
            if (!result || !result.mergedDictionary || !result.mergedExtractions) {
                throw new Error('Merger operation returned invalid result');
            }

            setProgressMessage('Mergers applied successfully!');
            setProgressPercentage(100);
            setShowSuccessMessage(true);

            // Small delay to show success before completing
            await new Promise(resolve => setTimeout(resolve, 500));

            onComplete(result);
        } catch (err) {
            console.error('Failed to apply mergers:', err);

            let errorMessage = 'Failed to apply mergers';

            if (err instanceof Error) {
                if (err.message.includes('Invalid merger')) {
                    errorMessage = err.message;
                } else if (err.message.includes('Duplicate')) {
                    errorMessage = err.message;
                } else if (err.message.includes('memory') || err.message.includes('Memory')) {
                    errorMessage = 'Insufficient memory to apply mergers. Try with fewer mergers.';
                } else {
                    errorMessage = `Merger application failed: ${err.message}`;
                }
            }

            setError(errorMessage);
        } finally {
            setIsProcessing(false);
            if (!showSuccessMessage) {
                setProgressMessage('');
                setProgressPercentage(0);
            }
        }
    };

    const getAcceptedCount = () => {
        return appliedMergers.length;
    };

    const getTotalItemsToMerge = () => {
        return appliedMergers.reduce((sum, merger) => sum + merger.items.length, 0);
    };

    const handleRetryGeneration = () => {
        setRetryCount(prev => prev + 1);
        setError(null);
        setSuggestions([]);
    };

    const handleSkipMerging = () => {
        // Skip merging and return original data
        onComplete({
            mergedDictionary: dictionary,
            mergedExtractions: extractions,
            appliedMergers: [],
        });
    };

    const renderConfirmationDialog = () => (
        <Dialog
            hidden={!showConfirmDialog}
            onDismiss={() => setShowConfirmDialog(false)}
            dialogContentProps={{
                type: DialogType.normal,
                title: 'Confirm Mergers',
                subText: `You are about to apply ${appliedMergers.length} merger${appliedMergers.length !== 1 ? 's' : ''}, merging ${getTotalItemsToMerge()} items into ${appliedMergers.length} consolidated entries. This action cannot be undone.`,
            }}
            modalProps={{
                isBlocking: true,
                styles: { main: { maxWidth: 450 } },
            }}
        >
            <Stack tokens={{ childrenGap: 12 }}>
                {appliedMergers.map((merger, index) => (
                    <Stack key={merger.id} tokens={{ childrenGap: 4 }}>
                        <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                            {index + 1}. {merger.finalName} ({merger.type})
                        </Text>
                        <Text variant="small" styles={{ root: { color: '#605E5C', marginLeft: 16 } }}>
                            Merging: {merger.items.map(item => item.name).join(', ')}
                        </Text>
                    </Stack>
                ))}
            </Stack>
            <DialogFooter>
                <PrimaryButton
                    onClick={() => {
                        setShowConfirmDialog(false);
                        handleComplete();
                    }}
                    text="Apply Mergers"
                    disabled={isProcessing}
                />
                <DefaultButton
                    onClick={() => setShowConfirmDialog(false)}
                    text="Cancel"
                    disabled={isProcessing}
                />
            </DialogFooter>
        </Dialog>
    );

    return (
        <>
            <Stack tokens={stackTokens} styles={{ root: { height: '100%', overflow: 'auto' } }}>
                {/* Header */}
                <Stack tokens={{ childrenGap: 8 }}>
                    <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                        Dictionary Merger
                    </Text>
                    <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                        Review automatic suggestions and create manual mergers for similar dictionary items.
                    </Text>
                    <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                        Found {dictionary.length} dictionary items across {extractions.length} rows.
                    </Text>

                    {/* Auto-grouping option */}
                    <Checkbox
                        label="Auto-group rare entities (< 0.5% frequency) into 'Other'"
                        checked={enableAutoGrouping}
                        onChange={(_, checked) => setEnableAutoGrouping(!!checked)}
                        disabled={isLoading || isProcessing}
                        styles={{
                            root: { marginTop: 8 },
                            text: { fontSize: '14px', color: '#323130' }
                        }}
                    />
                </Stack>

                {/* Error message */}
                {error && (
                    <Stack tokens={{ childrenGap: 12 }}>
                        <MessageBar messageBarType={MessageBarType.error} isMultiline>
                            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                                Dictionary Merger Error
                            </Text>
                            <Text variant="medium" styles={{ root: { marginTop: '4px' } }}>
                                {error}
                            </Text>
                        </MessageBar>

                        {/* Error recovery options */}
                        <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign="start">
                            <DefaultButton
                                text="Try Again"
                                onClick={handleRetryGeneration}
                                iconProps={{ iconName: 'Refresh' }}
                                disabled={isLoading || isRetrying}
                                styles={{ root: { minWidth: 100 } }}
                            />
                            <DefaultButton
                                text="Skip Merging"
                                onClick={handleSkipMerging}
                                iconProps={{ iconName: 'Forward' }}
                                disabled={isLoading || isRetrying}
                                styles={{ root: { minWidth: 100 } }}
                            />
                            {retryCount > 0 && (
                                <Text variant="small" styles={{ root: { color: '#605E5C', alignSelf: 'center' } }}>
                                    Retry attempt {retryCount}
                                </Text>
                            )}
                        </Stack>
                    </Stack>
                )}

                {/* Loading state with progress */}
                {(isLoading || isProcessing) && (
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                            <Spinner size={SpinnerSize.small} />
                            <Text variant="medium">
                                {progressMessage || (isRetrying
                                    ? `Retrying analysis (attempt ${retryCount})...`
                                    : 'Analyzing dictionary items for similar entries...'
                                )}
                            </Text>
                        </Stack>
                        {progressPercentage > 0 && (
                            <ProgressIndicator
                                percentComplete={progressPercentage / 100}
                                description={progressMessage}
                                styles={{
                                    root: { marginTop: '8px' },
                                    progressBar: {
                                        backgroundColor: showSuccessMessage ? '#107C10' : undefined
                                    }
                                }}
                            />
                        )}
                    </Stack>
                )}

                {/* Success message */}
                {showSuccessMessage && !isLoading && !isProcessing && (
                    <MessageBar messageBarType={MessageBarType.success} isMultiline>
                        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                            <Icon iconName="CheckMark" styles={{ root: { color: '#107C10' } }} />
                            <Text variant="medium">
                                {progressMessage}
                            </Text>
                        </Stack>
                    </MessageBar>
                )}

                {/* Main content with tabs */}
                {!isLoading && !error && (
                    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { flex: 1 } }}>
                        <Pivot
                            selectedKey={currentStep}
                            onLinkClick={(item) => {
                                if (item?.props.itemKey) {
                                    setCurrentStep(item.props.itemKey as WorkflowStep);
                                }
                            }}
                        >
                            <PivotItem
                                headerText={`Automatic Suggestions${suggestions.length > 0 ? ` (${suggestions.length})` : ''}`}
                                itemKey="suggestions"
                            >
                                <Stack tokens={{ childrenGap: 16 }} styles={{ root: { paddingTop: 16 } }}>
                                    <AutomaticSuggestions
                                        suggestions={suggestions}
                                        appliedMergers={appliedMergers}
                                        onAccept={handleAcceptSuggestion}
                                        onReject={handleRejectSuggestion}
                                        onModify={handleModifySuggestion}
                                        onRemove={handleRemoveMerger}
                                        isLoading={isLoading}
                                        maxVisibleSuggestions={20}
                                    />
                                </Stack>
                            </PivotItem>
                            <PivotItem
                                headerText={`Manual Merger${availableItemsForManual.length > 0 ? ` (${availableItemsForManual.length} available)` : ''}`}
                                itemKey="manual"
                            >
                                <Stack tokens={{ childrenGap: 16 }} styles={{ root: { paddingTop: 16 } }}>
                                    <ManualMerger
                                        availableItems={availableItemsForManual}
                                        onCreateMerger={handleCreateManualMerger}
                                        onCancel={() => setCurrentStep('suggestions')}
                                    />
                                </Stack>
                            </PivotItem>
                        </Pivot>
                    </Stack>
                )}

                {/* Summary */}
                {!isLoading && !error && appliedMergers.length > 0 && (
                    <MessageBar messageBarType={MessageBarType.success}>
                        {getAcceptedCount()} merger{getAcceptedCount() !== 1 ? 's' : ''} ready to apply,
                        merging {getTotalItemsToMerge()} items into {getAcceptedCount()} consolidated entries.
                    </MessageBar>
                )}

                {/* Action buttons */}
                {!isLoading && (
                    <Stack
                        horizontal
                        tokens={{ childrenGap: 8 }}
                        horizontalAlign="end"
                        styles={{ root: { marginTop: 'auto', paddingTop: 16 } }}
                    >
                        <DefaultButton
                            text="Cancel"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            styles={{ root: { minWidth: 100 } }}
                        />
                        <PrimaryButton
                            text={
                                isProcessing
                                    ? "Processing..."
                                    : appliedMergers.length > 0
                                        ? "Review & Apply"
                                        : "Skip Merging"
                            }
                            onClick={handleProceedToConfirmation}
                            disabled={isProcessing}
                            styles={{ root: { minWidth: 120 } }}
                        />
                        {isProcessing && (
                            <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign="center">
                                <Spinner size={SpinnerSize.small} />
                                <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                                    {progressMessage}
                                </Text>
                            </Stack>
                        )}
                    </Stack>
                )}
            </Stack>

            {/* Confirmation dialog */}
            {renderConfirmationDialog()}
        </>
    );
}