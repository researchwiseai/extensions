import Fuse, { type IFuseOptions } from 'fuse.js';

// Core data types for dictionary merger functionality
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

export interface FuzzyMatchOptions {
    threshold: number; // 0.0 to 1.0, default 0.8
    maxSuggestions: number; // default 10
    timeout: number; // milliseconds, default 5000
}

// Default options for fuzzy matching
const DEFAULT_OPTIONS: FuzzyMatchOptions = {
    threshold: 0.6, // Lowered threshold for better matching
    maxSuggestions: 10,
    timeout: 5000,
};

/**
 * Core dictionary merger class that provides fuzzy matching and merger functionality
 * for consolidating similar dictionary items in text extraction results.
 */
export class DictionaryMerger {
    private fuseOptions: IFuseOptions<string>;

    constructor() {
        // Configure Fuse.js for optimal fuzzy matching
        this.fuseOptions = {
            includeScore: true,
            threshold: 0.3, // Lower threshold for more strict matching
            ignoreLocation: true,
            findAllMatches: true,
            minMatchCharLength: 2,
        };
    }

    /**
     * Generate merger suggestions for similar dictionary items
     * @param dictionary Array of dictionary item names
     * @param extractions 2D array of extraction results
     * @param options Optional configuration for fuzzy matching
     * @returns Promise resolving to array of merger suggestions
     */
    async generateSuggestions(
        dictionary: string[],
        extractions: string[][],
        options: Partial<FuzzyMatchOptions> = {},
    ): Promise<MergerSuggestion[]> {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Fuzzy matching timeout exceeded'));
            }, opts.timeout);

            try {
                const suggestions = this.performFuzzyMatching(
                    dictionary,
                    extractions,
                    opts,
                );
                clearTimeout(timeoutId);
                resolve(suggestions);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Apply approved mergers to dictionary and extraction data
     * @param dictionary Original dictionary array
     * @param extractions Original extractions 2D array
     * @param mergers Array of merger groups to apply
     * @returns Merged result with updated dictionary and extractions
     */
    applyMergers(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ): MergerResult {
        // Create mapping of old names to new names
        const nameMapping = new Map<string, string>();

        for (const merger of mergers) {
            for (const item of merger.items) {
                nameMapping.set(item.name, merger.finalName);
            }
        }

        // Create merged dictionary by replacing merged items with final names
        const mergedDictionary: string[] = [];
        const processedNames = new Set<string>();

        for (const name of dictionary) {
            const finalName = nameMapping.get(name) || name;
            if (!processedNames.has(finalName)) {
                mergedDictionary.push(finalName);
                processedNames.add(finalName);
            }
        }

        // Update extractions to use merged names
        const mergedExtractions = extractions.map((row) =>
            row.map((item) => nameMapping.get(item) || item),
        );

        return {
            mergedDictionary,
            mergedExtractions,
            appliedMergers: mergers,
        };
    }

    /**
     * Calculate similarity score between two strings using multiple strategies
     * @param item1 First string to compare
     * @param item2 Second string to compare
     * @returns Similarity score between 0.0 and 1.0
     */
    private calculateSimilarity(item1: string, item2: string): number {
        if (item1 === item2) return 1.0;

        const lower1 = item1.toLowerCase().trim();
        const lower2 = item2.toLowerCase().trim();

        if (lower1 === lower2) return 1.0;

        // Check for substring matches (e.g., "Copilot" in "Microsoft Copilot")
        const substringScore = this.calculateSubstringScore(lower1, lower2);

        // Use Fuse.js for fuzzy string matching
        const fuse = new Fuse([lower1], this.fuseOptions);
        const fuseResults = fuse.search(lower2);
        const fuseScore =
            fuseResults.length > 0 ? 1 - (fuseResults[0].score || 0) : 0;

        // Token-based similarity for multi-word terms
        const tokenScore = this.calculateTokenSimilarity(lower1, lower2);

        // Check for common brand abbreviations
        const brandScore = this.calculateBrandSimilarity(lower1, lower2);

        // Return the highest score from all strategies
        return Math.max(substringScore, fuseScore, tokenScore, brandScore);
    }

    /**
     * Calculate substring similarity score
     */
    private calculateSubstringScore(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.includes(shorter)) {
            return shorter.length / longer.length;
        }

        return 0;
    }

    /**
     * Calculate token-based similarity for multi-word terms
     */
    private calculateTokenSimilarity(str1: string, str2: string): number {
        const tokens1 = str1.split(/\s+/).filter((t) => t.length > 0);
        const tokens2 = str2.split(/\s+/).filter((t) => t.length > 0);

        if (tokens1.length === 0 || tokens2.length === 0) return 0;

        let matchingTokens = 0;
        for (const token1 of tokens1) {
            for (const token2 of tokens2) {
                if (
                    token1 === token2 ||
                    token1.includes(token2) ||
                    token2.includes(token1)
                ) {
                    matchingTokens++;
                    break;
                }
                // Check for fuzzy match between tokens
                const fuse = new Fuse([token1], { threshold: 0.4 });
                const results = fuse.search(token2);
                if (
                    results.length > 0 &&
                    results[0].score !== undefined &&
                    results[0].score < 0.4
                ) {
                    matchingTokens += 1 - results[0].score;
                    break;
                }
            }
        }

        return matchingTokens / Math.max(tokens1.length, tokens2.length);
    }

    /**
     * Calculate brand similarity for common abbreviations and variations
     */
    private calculateBrandSimilarity(str1: string, str2: string): number {
        // Common brand patterns - this is a simple implementation
        // In a real-world scenario, this could be expanded with a comprehensive database
        const brandPatterns = [
            ['coke', 'coca cola', 'coca-cola'],
            ['pepsi', 'pepsi cola'],
            ['microsoft', 'ms'],
            ['google', 'alphabet'],
            ['facebook', 'meta'],
        ];

        for (const pattern of brandPatterns) {
            if (pattern.includes(str1) && pattern.includes(str2)) {
                return 0.8; // High similarity for known brand variations
            }
        }

        // Check if one string starts with the other (common for brand variations)
        if (str1.startsWith(str2) || str2.startsWith(str1)) {
            const shorter = str1.length < str2.length ? str1 : str2;
            const longer = str1.length < str2.length ? str2 : str1;
            return shorter.length / longer.length;
        }

        return 0;
    }

    /**
     * Determine if two items should be suggested for merging
     */
    private shouldSuggestMerger(
        item1: string,
        item2: string,
        threshold: number,
    ): boolean {
        const similarity = this.calculateSimilarity(item1, item2);
        return similarity >= threshold;
    }

    /**
     * Perform the actual fuzzy matching logic
     */
    private performFuzzyMatching(
        dictionary: string[],
        extractions: string[][],
        options: FuzzyMatchOptions,
    ): MergerSuggestion[] {
        const suggestions: MergerSuggestion[] = [];
        const processed = new Set<string>();

        // Create dictionary items with extraction counts
        const dictionaryItems = this.createDictionaryItems(
            dictionary,
            extractions,
        );

        for (let i = 0; i < dictionary.length; i++) {
            const item1 = dictionary[i];
            if (processed.has(item1)) continue;

            const similarItems: DictionaryItem[] = [dictionaryItems[item1]];

            for (let j = i + 1; j < dictionary.length; j++) {
                const item2 = dictionary[j];
                if (processed.has(item2)) continue;

                if (this.shouldSuggestMerger(item1, item2, options.threshold)) {
                    similarItems.push(dictionaryItems[item2]);
                    processed.add(item2);
                }
            }

            if (similarItems.length > 1) {
                // Choose the most common item as the suggested name
                const suggestedItem = similarItems.reduce((prev, current) =>
                    current.extractionCount > prev.extractionCount
                        ? current
                        : prev,
                );

                const confidence = this.calculateGroupConfidence(similarItems);

                suggestions.push({
                    id: `suggestion_${suggestions.length}`,
                    items: similarItems,
                    suggestedName: suggestedItem.name,
                    confidence,
                    reason: this.determineMatchReason(similarItems),
                });

                processed.add(item1);

                if (suggestions.length >= options.maxSuggestions) {
                    break;
                }
            }
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Create dictionary items with extraction counts and cell references
     */
    private createDictionaryItems(
        dictionary: string[],
        extractions: string[][],
    ): Record<string, DictionaryItem> {
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

        return items;
    }

    /**
     * Calculate confidence score for a group of similar items
     */
    private calculateGroupConfidence(items: DictionaryItem[]): number {
        if (items.length < 2) return 0;

        // Base confidence on similarity scores between items
        let totalSimilarity = 0;
        let comparisons = 0;

        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                totalSimilarity += this.calculateSimilarity(
                    items[i].name,
                    items[j].name,
                );
                comparisons++;
            }
        }

        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }

    /**
     * Determine the primary reason for suggesting a merger
     */
    private determineMatchReason(
        items: DictionaryItem[],
    ): MergerSuggestion['reason'] {
        // Simple heuristic: if any item is a substring of another, it's substring_match
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const name1 = items[i].name.toLowerCase();
                const name2 = items[j].name.toLowerCase();
                if (name1.includes(name2) || name2.includes(name1)) {
                    return 'substring_match';
                }
            }
        }

        return 'fuzzy_match';
    }
}
