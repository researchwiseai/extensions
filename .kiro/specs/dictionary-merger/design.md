# Design Document

## Overview

The Dictionary Merger feature extends the existing extract named entities
functionality by adding intelligent merger suggestions and a visual merger
interface. The feature integrates into the current extraction workflow by
intercepting the results before they are written to the Excel sheet, providing
users with merger options, and then writing the consolidated data.

The design follows the existing architectural patterns in the Pulse codebase,
utilizing the shared runtime architecture, Office.js dialog API, and React-based
modal interfaces. Core matching logic will be implemented in the common package
for future reusability across platforms.

## Architecture

### High-Level Flow

```
Extract Named Entities → Fuzzy Match Analysis → Merger Dialog → Apply Mergers → Write to Sheet
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Excel Add-in Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  extractElementsFromWorksheet()                                 │
│  ├── Existing extraction logic                                  │
│  ├── NEW: Merger suggestion generation                          │
│  ├── NEW: Merger dialog display                                 │
│  └── NEW: Post-merger data writing                              │
├─────────────────────────────────────────────────────────────────┤
│                        Modal Dialog Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  DictionaryMergerDialog (React Component)                       │
│  ├── AutomaticSuggestions component                             │
│  ├── ManualMerger component                                     │
│  └── MergerConfirmation component                               │
├─────────────────────────────────────────────────────────────────┤
│                        Common Package Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  Fuzzy Matching Engine                                          │
│  ├── generateMergerSuggestions()                                │
│  ├── calculateSimilarity()                                      │
│  └── applyMergers()                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Core Data Types

```typescript
// Common package types
export interface DictionaryItem {
    name: string;
    extractionCount: number;
    cellReferences: string[]; // Array of cell addresses where this item appears
}

export interface MergerSuggestion {
    id: string;
    items: DictionaryItem[];
    suggestedName: string;
    confidence: number;
    reason: 'fuzzy_match' | 'substring_match' | 'semantic_similarity';
}

export interface MergerGroup {
    id: string;
    items: DictionaryItem[];
    finalName: string;
    type: 'automatic' | 'manual';
}

export interface MergerResult {
    mergedDictionary: string[];
    mergedExtractions: string[][];
    appliedMergers: MergerGroup[];
}
```

### Fuzzy Matching Engine (Common Package)

```typescript
// packages/common/src/dictionaryMerger.ts
export interface FuzzyMatchOptions {
    threshold: number; // 0.0 to 1.0, default 0.8
    maxSuggestions: number; // default 10
    timeout: number; // milliseconds, default 5000
}

export class DictionaryMerger {
    generateSuggestions(
        dictionary: string[],
        extractions: string[][],
        options?: FuzzyMatchOptions,
    ): Promise<MergerSuggestion[]>;

    applyMergers(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ): MergerResult;

    private calculateSimilarity(item1: string, item2: string): number;
    private shouldSuggestMerger(
        item1: string,
        item2: string,
        threshold: number,
    ): boolean;
}
```

### Excel Integration Layer

```typescript
// packages/excel/src/extractElements.ts (modified)
export async function extractElementsFromWorksheet(options: {
    sheetName: string | null;
    hasHeader: boolean;
    dictionary: string[];
    expandDictionary: boolean;
}) {
    // ... existing extraction logic ...

    const result = await extractElementsApi(inputs, {
        category: 'entity',
        dictionary,
        expandDictionary: options.expandDictionary,
        fast: false,
        onProgress: (m) => console.log(m),
    });

    // NEW: Check if merger dialog should be shown
    if (options.expandDictionary && result.dictionary.length > 1) {
        const mergerResult = await showMergerDialog(
            result.dictionary,
            result.results,
        );
        if (mergerResult) {
            // Apply mergers and use merged data
            const finalResult = {
                ...result,
                dictionary: mergerResult.mergedDictionary,
                results: mergerResult.mergedExtractions,
            };
            await writeResultsToSheet(finalResult /* ... other params ... */);
            return;
        }
    }

    // Existing write logic for non-merged results
    await writeResultsToSheet(result /* ... other params ... */);
}
```

### Modal Dialog Components

```typescript
// packages/excel/src/modal/types.ts (extended)
export type ModalView =
    | 'themeSets'
    | 'themeSetsChoice'
    | 'unexpectedError'
    | 'dictionaryMerger'; // NEW

// packages/excel/src/components/DictionaryMergerDialog.tsx
export interface DictionaryMergerDialogProps {
    dictionary: string[];
    extractions: string[][];
    onComplete: (result: MergerResult | null) => void;
}

export function DictionaryMergerDialog({
    dictionary,
    extractions,
    onComplete,
}: DictionaryMergerDialogProps) {
    // Component implementation
}
```

## Data Models

### Merger Suggestion Generation

The fuzzy matching algorithm will use multiple strategies:

1. **String Similarity**: Levenshtein distance for detecting minor variations
2. **Substring Matching**: Detecting when one term is contained within another
3. **Token-based Matching**: Comparing individual words within multi-word terms
4. **Semantic Similarity**: Basic keyword overlap analysis

### Extraction Data Merging

When mergers are applied, the system will:

1. **Combine Extraction Arrays**: Merge all extraction arrays from merged items
2. **Update Cell References**: Maintain mapping of which cells contain which
   merged items
3. **Preserve Original Data**: Keep backup of original extractions for potential
   rollback

## Error Handling

### Fuzzy Matching Errors

- **Timeout Handling**: If matching takes too long, proceed without suggestions
- **Memory Limits**: Implement safeguards for large dictionaries
- **Invalid Input**: Handle edge cases with empty or malformed dictionary items

### Dialog Errors

- **Dialog Launch Failures**: Fall back to direct sheet writing
- **User Cancellation**: Preserve original data when user cancels
- **Communication Errors**: Robust message passing between dialog and parent

### Data Integrity

- **Merger Validation**: Ensure merged data maintains consistency
- **Rollback Capability**: Allow reverting to original extractions if needed
- **Conflict Resolution**: Handle cases where mergers create data conflicts

## Testing Strategy

### Unit Tests (Common Package)

```typescript
// packages/common/__tests__/dictionaryMerger.test.ts
describe('DictionaryMerger', () => {
    describe('generateSuggestions', () => {
        it('should suggest merging "Microsoft Copilot" and "Copilot"');
        it('should suggest merging "Coke" and "Coca Cola"');
        it('should not suggest merging clearly different items');
        it('should handle timeout gracefully');
    });

    describe('applyMergers', () => {
        it('should correctly merge extraction arrays');
        it('should update dictionary with merged names');
        it('should preserve data integrity');
    });
});
```

### Integration Tests (Excel Package)

```typescript
// packages/excel/src/__tests__/dictionaryMerger.integration.test.ts
describe('Dictionary Merger Integration', () => {
    it('should integrate with existing extraction workflow');
    it('should handle dialog communication correctly');
    it('should write merged data to sheet properly');
});
```

### UI Tests

- **Dialog Rendering**: Ensure merger suggestions display correctly
- **User Interactions**: Test accept/reject/modify functionality
- **Manual Merger**: Test custom merger creation interface
- **Error States**: Test error handling in UI components

## Performance Considerations

### Fuzzy Matching Optimization

- **Threshold Tuning**: Optimize similarity thresholds for accuracy vs
  performance
- **Batch Processing**: Process large dictionaries in chunks
- **Caching**: Cache similarity calculations for repeated comparisons
- **Early Termination**: Stop processing when timeout is reached

### UI Responsiveness

- **Progressive Loading**: Show suggestions as they are generated
- **Debounced Updates**: Prevent excessive re-renders during user interactions
- **Lazy Rendering**: Only render visible merger suggestions

### Memory Management

- **Data Cleanup**: Clean up temporary data structures after processing
- **Efficient Storage**: Use appropriate data structures for large datasets
- **Garbage Collection**: Ensure proper cleanup of event handlers and references

## Security Considerations

### Data Privacy

- **Local Processing**: All fuzzy matching occurs client-side
- **No Data Persistence**: Merger suggestions are not stored permanently
- **Secure Communication**: Use existing secure dialog communication patterns

### Input Validation

- **Dictionary Sanitization**: Validate dictionary items before processing
- **Extraction Validation**: Ensure extraction data integrity
- **User Input Validation**: Validate manual merger inputs

## Implementation Dependencies

### New Dependencies

```json
// packages/common/package.json
{
    "dependencies": {
        "fuse.js": "^7.0.0" // For fuzzy string matching
    }
}
```

### Existing Dependencies

- Office.js Dialog API (already in use)
- React 19 (already in use)
- Fluent UI components (already in use)
- TypeScript (already in use)

## Migration Strategy

### Backward Compatibility

- **Feature Flag**: Merger functionality only activates when `expandDictionary`
  is true
- **Graceful Degradation**: System falls back to original behavior if merger
  fails
- **Optional Enhancement**: Existing workflows continue to work unchanged

### Rollout Plan

1. **Phase 1**: Implement core fuzzy matching in common package
2. **Phase 2**: Add dialog components and UI
3. **Phase 3**: Integrate with existing extraction workflow
4. **Phase 4**: Add manual merger functionality
5. **Phase 5**: Performance optimization and testing
