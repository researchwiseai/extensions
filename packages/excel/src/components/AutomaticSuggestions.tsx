import { useState, useMemo, useCallback, memo } from 'react';
import {
    Stack,
    Text,
    PrimaryButton,
    DefaultButton,
    TextField,
    MessageBar,
    MessageBarType,
    IStackTokens,
    Icon,
    Spinner,
    SpinnerSize,
} from '@fluentui/react';
import { MergerSuggestion, MergerGroup } from 'pulse-common';

export interface AutomaticSuggestionsProps {
    suggestions: MergerSuggestion[];
    appliedMergers: MergerGroup[];
    onAccept: (suggestion: MergerSuggestion, finalName?: string) => void;
    onReject: (suggestion: MergerSuggestion) => void;
    onModify: (suggestion: MergerSuggestion, finalName: string) => void;
    onRemove: (mergerId: string) => void;
    isLoading?: boolean;
    maxVisibleSuggestions?: number; // For virtualization
}

const stackTokens: IStackTokens = {
    childrenGap: 16,
};

const suggestionCardTokens: IStackTokens = {
    childrenGap: 8,
};

// Memoized suggestion card component for better performance
const SuggestionCard = memo(({
    suggestion,
    accepted,
    acceptedMerger,
    isModifying,
    customName,
    onAccept,
    onReject,
    onModify,
    onRemove,
    onStartModifying,
    onCancelModifying,
    onCustomNameChange,
}: {
    suggestion: MergerSuggestion;
    accepted: boolean;
    acceptedMerger?: MergerGroup;
    isModifying: boolean;
    customName: string;
    onAccept: () => void;
    onReject: () => void;
    onModify: () => void;
    onRemove: () => void;
    onStartModifying: () => void;
    onCancelModifying: () => void;
    onCustomNameChange: (value: string) => void;
}) => {
    const getReasonIcon = useCallback((reason: MergerSuggestion['reason']): string => {
        switch (reason) {
            case 'fuzzy_match':
                return 'SearchAndApps';
            case 'substring_match':
                return 'TextOverflow';
            case 'semantic_similarity':
                return 'BranchMerge';
            case 'auto_other':
                return 'AutoEnhanceOn';
            default:
                return 'Merge';
        }
    }, []);

    const getReasonText = useCallback((reason: MergerSuggestion['reason']): string => {
        switch (reason) {
            case 'fuzzy_match':
                return 'Similar spelling';
            case 'substring_match':
                return 'One contains the other';
            case 'semantic_similarity':
                return 'Semantically similar';
            case 'auto_other':
                return 'Auto-grouped rare entities';
            default:
                return 'Similar items';
        }
    }, []);

    const getConfidenceColor = useCallback((confidence: number): string => {
        if (confidence >= 0.8) return '#107C10'; // Green
        if (confidence >= 0.6) return '#FF8C00'; // Orange
        return '#D13438'; // Red
    }, []);

    const cardStyles = useMemo(() => ({
        padding: '16px',
        border: '1px solid #E1DFDD',
        borderRadius: '4px',
        backgroundColor: accepted ? '#F3F9F1' : '#FFFFFF'
    }), [accepted]);

    return (
        <div style={cardStyles}>
            <Stack tokens={suggestionCardTokens}>
                {/* Header with confidence and reason */}
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                        <Icon
                            iconName={getReasonIcon(suggestion.reason)}
                            styles={{ root: { color: '#605E5C' } }}
                        />
                        <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                            {getReasonText(suggestion.reason)}
                        </Text>
                    </Stack>
                    <Text
                        variant="small"
                        styles={{
                            root: {
                                color: getConfidenceColor(suggestion.confidence),
                                fontWeight: 600
                            }
                        }}
                    >
                        {Math.round(suggestion.confidence * 100)}% confidence
                    </Text>
                </Stack>

                {/* Items to merge */}
                <Stack tokens={{ childrenGap: 4 }}>
                    <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                        Items to merge:
                    </Text>
                    <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
                        {suggestion.items.map((item, index) => (
                            <Stack key={index} horizontal tokens={{ childrenGap: 4 }} verticalAlign="center">
                                <Text
                                    variant="medium"
                                    styles={{
                                        root: {
                                            padding: '4px 8px',
                                            backgroundColor: '#F3F2F1',
                                            borderRadius: '4px',
                                            border: '1px solid #E1DFDD'
                                        }
                                    }}
                                >
                                    {item.name}
                                </Text>
                                <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                                    ({item.extractionCount} extractions)
                                </Text>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>

                {/* Suggested name or custom name input */}
                <Stack tokens={{ childrenGap: 8 }}>
                    <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                        {accepted ? 'Merged as:' : 'Suggested name:'}
                    </Text>

                    {isModifying ? (
                        <Stack tokens={{ childrenGap: 8 }}>
                            <TextField
                                value={customName}
                                onChange={(_, value) => onCustomNameChange(value || '')}
                                placeholder="Enter custom name"
                                autoFocus
                            />
                            <Stack horizontal tokens={{ childrenGap: 8 }}>
                                <PrimaryButton
                                    text="Save"
                                    onClick={onModify}
                                    disabled={!customName.trim()}
                                    styles={{ root: { minWidth: 80 } }}
                                />
                                <DefaultButton
                                    text="Cancel"
                                    onClick={onCancelModifying}
                                    styles={{ root: { minWidth: 80 } }}
                                />
                            </Stack>
                        </Stack>
                    ) : (
                        <Text
                            variant="mediumPlus"
                            styles={{
                                root: {
                                    fontWeight: 600,
                                    color: accepted ? '#107C10' : '#323130',
                                    padding: '8px 12px',
                                    backgroundColor: accepted ? '#F3F9F1' : '#FAFAFA',
                                    border: `1px solid ${accepted ? '#C7E0C7' : '#E1DFDD'}`,
                                    borderRadius: '4px'
                                }
                            }}
                        >
                            {acceptedMerger?.finalName || suggestion.suggestedName}
                        </Text>
                    )}
                </Stack>

                {/* Action buttons */}
                <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign="end">
                    {suggestion.reason === 'auto_other' ? (
                        // Auto-other suggestions are automatically accepted and cannot be modified
                        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                            <Icon
                                iconName="CheckMark"
                                styles={{ root: { color: '#107C10', fontSize: '16px' } }}
                            />
                            <Text
                                variant="medium"
                                styles={{ root: { color: '#107C10', fontWeight: 600 } }}
                            >
                                Automatically applied
                            </Text>
                        </Stack>
                    ) : accepted ? (
                        <DefaultButton
                            text="Remove"
                            onClick={onRemove}
                            iconProps={{ iconName: 'Delete' }}
                            styles={{ root: { minWidth: 100 } }}
                        />
                    ) : (
                        <>
                            <DefaultButton
                                text="Reject"
                                onClick={onReject}
                                styles={{ root: { minWidth: 80 } }}
                            />
                            <DefaultButton
                                text="Modify"
                                onClick={onStartModifying}
                                iconProps={{ iconName: 'Edit' }}
                                styles={{ root: { minWidth: 80 } }}
                            />
                            <PrimaryButton
                                text="Accept"
                                onClick={onAccept}
                                iconProps={{ iconName: 'CheckMark' }}
                                styles={{ root: { minWidth: 80 } }}
                            />
                        </>
                    )}
                </Stack>
            </Stack>
        </div>
    );
});

export function AutomaticSuggestions({
    suggestions,
    appliedMergers,
    onAccept,
    onReject,
    onModify,
    onRemove,
    isLoading = false,
    maxVisibleSuggestions = 20,
}: AutomaticSuggestionsProps) {
    const [modifyingId, setModifyingId] = useState<string | null>(null);
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    const [showAll, setShowAll] = useState(false);

    // Memoized calculations for performance
    const isAccepted = useCallback((suggestionId: string): boolean => {
        return appliedMergers.some(merger => merger.id === suggestionId);
    }, [appliedMergers]);

    const getAcceptedMerger = useCallback((suggestionId: string): MergerGroup | undefined => {
        return appliedMergers.find(merger => merger.id === suggestionId);
    }, [appliedMergers]);

    // Memoized visible suggestions for virtualization
    const visibleSuggestions = useMemo(() => {
        if (showAll || suggestions.length <= maxVisibleSuggestions) {
            return suggestions;
        }
        return suggestions.slice(0, maxVisibleSuggestions);
    }, [suggestions, showAll, maxVisibleSuggestions]);

    const handleAccept = useCallback((suggestion: MergerSuggestion) => {
        onAccept(suggestion);
    }, [onAccept]);

    const handleReject = useCallback((suggestion: MergerSuggestion) => {
        onReject(suggestion);
        // Clear any custom name for this suggestion
        setCustomNames(prev => {
            const { [suggestion.id]: _, ...rest } = prev;
            return rest;
        });
    }, [onReject]);

    const handleModify = useCallback((suggestion: MergerSuggestion) => {
        const customName = customNames[suggestion.id];
        if (customName && customName.trim()) {
            onModify(suggestion, customName.trim());
            setModifyingId(null);
        }
    }, [customNames, onModify]);

    const handleCustomNameChange = useCallback((suggestionId: string, value: string) => {
        setCustomNames(prev => ({
            ...prev,
            [suggestionId]: value,
        }));
    }, []);

    const handleStartModifying = useCallback((suggestion: MergerSuggestion) => {
        setModifyingId(suggestion.id);
        setCustomNames(prev => ({
            ...prev,
            [suggestion.id]: suggestion.suggestedName,
        }));
    }, []);

    const handleCancelModifying = useCallback((suggestion: MergerSuggestion) => {
        setModifyingId(null);
        setCustomNames(prev => ({
            ...prev,
            [suggestion.id]: suggestion.suggestedName,
        }));
    }, []);

    const handleRemove = useCallback((suggestionId: string) => {
        onRemove(suggestionId);
    }, [onRemove]);

    if (isLoading) {
        return (
            <Stack tokens={stackTokens} horizontalAlign="center">
                <Spinner size={SpinnerSize.large} label="Analyzing dictionary for merger suggestions..." />
            </Stack>
        );
    }

    if (suggestions.length === 0) {
        return (
            <Stack tokens={stackTokens}>
                <MessageBar messageBarType={MessageBarType.info}>
                    <Stack tokens={{ childrenGap: 4 }}>
                        <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                            No automatic merger suggestions found
                        </Text>
                        <Text variant="medium">
                            All dictionary items appear to be sufficiently different. You can still create manual mergers if needed.
                        </Text>
                    </Stack>
                </MessageBar>
            </Stack>
        );
    }

    return (
        <Stack tokens={stackTokens}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                    Automatic Suggestions ({suggestions.length})
                </Text>
                {suggestions.length > maxVisibleSuggestions && (
                    <DefaultButton
                        text={showAll ? 'Show Less' : `Show All (${suggestions.length})`}
                        onClick={() => setShowAll(!showAll)}
                        iconProps={{ iconName: showAll ? 'ChevronUp' : 'ChevronDown' }}
                    />
                )}
            </Stack>

            <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                Review these suggested mergers based on similarity analysis. You can accept, reject, or modify the suggested name.
            </Text>

            {visibleSuggestions.map((suggestion) => {
                const accepted = isAccepted(suggestion.id);
                const acceptedMerger = getAcceptedMerger(suggestion.id);
                const isModifying = modifyingId === suggestion.id;
                const customName = customNames[suggestion.id] || suggestion.suggestedName;

                return (
                    <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        accepted={accepted}
                        acceptedMerger={acceptedMerger}
                        isModifying={isModifying}
                        customName={customName}
                        onAccept={() => handleAccept(suggestion)}
                        onReject={() => handleReject(suggestion)}
                        onModify={() => handleModify(suggestion)}
                        onRemove={() => handleRemove(suggestion.id)}
                        onStartModifying={() => handleStartModifying(suggestion)}
                        onCancelModifying={() => handleCancelModifying(suggestion)}
                        onCustomNameChange={(value) => handleCustomNameChange(suggestion.id, value)}
                    />
                );
            })}

            {/* Applied mergers summary */}
            {appliedMergers.length > 0 && (
                <Stack tokens={{ childrenGap: 8 }}>
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                        Applied Mergers ({appliedMergers.length})
                    </Text>
                    {appliedMergers.map((merger) => (
                        <Stack key={merger.id} horizontal horizontalAlign="space-between" verticalAlign="center"
                            styles={{
                                root: {
                                    padding: '8px 12px',
                                    backgroundColor: '#F3F9F1',
                                    border: '1px solid #C7E0C7',
                                    borderRadius: '4px'
                                }
                            }}
                        >
                            <Stack tokens={{ childrenGap: 4 }}>
                                <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                                    {merger.finalName} ({merger.type})
                                </Text>
                                <Text variant="small" styles={{ root: { color: '#605E5C' } }}>
                                    Merging: {merger.items.map(item => item.name).join(', ')}
                                </Text>
                            </Stack>
                            <DefaultButton
                                text="Remove"
                                onClick={() => onRemove(merger.id)}
                                iconProps={{ iconName: 'Delete' }}
                                styles={{ root: { minWidth: 80 } }}
                            />
                        </Stack>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}