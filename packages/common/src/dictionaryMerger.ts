import Fuse, { type IFuseOptions } from 'fuse.js';

// Core data types for dictionary merger functionality
export interface DictionaryItem {
    name: string;
    extractionCount: number;
    cellReferences: string[]; // Array of cell addresses where this item appears
}

// Performance optimization interfaces
export interface BatchProcessingOptions {
    batchSize: number; // Number of items to process in each batch
    maxConcurrentBatches: number; // Maximum number of concurrent batch operations
    progressCallback?: (processed: number, total: number) => void;
}

export interface CacheEntry {
    similarity: number;
    timestamp: number;
}

export interface PerformanceMetrics {
    totalProcessingTime: number;
    cacheHitRate: number;
    batchesProcessed: number;
    itemsProcessed: number;
}

export interface MergerSuggestion {
    id: string;
    items: DictionaryItem[];
    suggestedName: string;
    confidence: number;
    reason:
        | 'fuzzy_match'
        | 'substring_match'
        | 'semantic_similarity'
        | 'auto_other';
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
    enableBatchProcessing?: boolean; // Enable batch processing for large datasets
    batchOptions?: BatchProcessingOptions; // Batch processing configuration
    enableCaching?: boolean; // Enable similarity calculation caching
    cacheMaxAge?: number; // Cache entry max age in milliseconds
    autoGroupRareEntities?: boolean; // Enable auto-grouping of rare entities
    rareEntityThreshold?: number; // Threshold for rare entities (default 0.005 = 0.5%)
}

// Default options for fuzzy matching
const DEFAULT_OPTIONS: FuzzyMatchOptions = {
    threshold: 0.6, // Lowered threshold for better matching
    maxSuggestions: 10,
    timeout: 5000,
    enableBatchProcessing: true,
    batchOptions: {
        batchSize: 50,
        maxConcurrentBatches: 3,
    },
    enableCaching: true,
    cacheMaxAge: 300000, // 5 minutes
    autoGroupRareEntities: false, // Disabled by default
    rareEntityThreshold: 0.005, // 0.5% threshold
};

/**
 * Core dictionary merger class that provides fuzzy matching and merger functionality
 * for consolidating similar dictionary items in text extraction results.
 * Includes performance optimizations for large datasets.
 */
export class DictionaryMerger {
    private fuseOptions: IFuseOptions<string>;
    private similarityCache: Map<string, CacheEntry>;
    private performanceMetrics: PerformanceMetrics;

    constructor() {
        // Configure Fuse.js for optimal fuzzy matching
        this.fuseOptions = {
            includeScore: true,
            threshold: 0.3, // Lower threshold for more strict matching
            ignoreLocation: true,
            findAllMatches: true,
            minMatchCharLength: 2,
        };

        // Initialize performance optimization components
        this.similarityCache = new Map();
        this.performanceMetrics = {
            totalProcessingTime: 0,
            cacheHitRate: 0,
            batchesProcessed: 0,
            itemsProcessed: 0,
        };
    }

    /**
     * Identify rare entities that should be auto-grouped into "Other"
     * @param dictionary Array of dictionary item names
     * @param extractions 2D array of extraction results
     * @param threshold Threshold for rare entities (default 0.005 = 0.5%)
     * @returns Array of rare entity names
     */
    identifyRareEntities(
        dictionary: string[],
        extractions: string[][],
        threshold: number = 0.005,
    ): string[] {
        const dictionaryItems = this.createDictionaryItems(
            dictionary,
            extractions,
        );
        const totalCells = extractions.length * (extractions[0]?.length || 0);

        if (totalCells === 0) return [];

        const rareEntities: string[] = [];

        for (const name of dictionary) {
            const item = dictionaryItems[name];
            const percentage = item.extractionCount / totalCells;

            if (percentage < threshold && percentage > 0) {
                rareEntities.push(name);
            }
        }

        return rareEntities;
    }

    /**
     * Identify rare entities that should be auto-grouped into "Other" (3D version)
     * @param dictionary Array of dictionary item names
     * @param extractions 3D array of extraction results
     * @param threshold Threshold for rare entities (default 0.005 = 0.5%)
     * @returns Array of rare entity names
     */
    public identifyRareEntitiesFrom3D(
        dictionary: string[],
        extractions: string[][][],
        threshold: number = 0.005,
    ): string[] {
        const dictionaryItems = this.createDictionaryItemsFrom3D(
            dictionary,
            extractions,
        );
        const totalCells = extractions.length * (extractions[0]?.length || 0);

        if (totalCells === 0) return [];

        const rareEntities: string[] = [];

        for (const name of dictionary) {
            const item = dictionaryItems[name];
            const percentage = item.extractionCount / totalCells;

            if (percentage < threshold && percentage > 0) {
                rareEntities.push(name);
            }
        }

        return rareEntities;
    }

    /**
     * Create auto-grouping suggestion for rare entities
     * @param rareEntities Array of rare entity names
     * @param dictionary Array of dictionary item names
     * @param extractions 2D array of extraction results
     * @returns MergerSuggestion for rare entities or null if no rare entities
     */
    createRareEntitiesGrouping(
        rareEntities: string[],
        dictionary: string[],
        extractions: string[][],
    ): MergerSuggestion | null {
        if (rareEntities.length < 2) return null;

        const dictionaryItems = this.createDictionaryItems(
            dictionary,
            extractions,
        );
        const rareItems = rareEntities.map((name) => dictionaryItems[name]);

        return {
            id: 'auto_rare_entities_group',
            items: rareItems,
            suggestedName: 'Other',
            confidence: 1.0, // Maximum confidence for auto-accepted grouping
            reason: 'auto_other', // New reason type for automatically accepted rare entity grouping
        };
    }

    /**
     * Create auto-grouping suggestion for rare entities (3D version)
     * @param rareEntities Array of rare entity names
     * @param dictionary Array of dictionary item names
     * @param extractions 3D array of extraction results
     * @returns MergerSuggestion for rare entities or null if no rare entities
     */
    public createRareEntitiesGroupingFrom3D(
        rareEntities: string[],
        dictionary: string[],
        extractions: string[][][],
    ): MergerSuggestion | null {
        if (rareEntities.length < 2) return null;

        const dictionaryItems = this.createDictionaryItemsFrom3D(
            dictionary,
            extractions,
        );
        const rareItems = rareEntities.map((name) => dictionaryItems[name]);

        return {
            id: 'auto_rare_entities_group',
            items: rareItems,
            suggestedName: 'Other',
            confidence: 1.0, // Maximum confidence for auto-accepted grouping
            reason: 'auto_other', // New reason type for automatically accepted rare entity grouping
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
        const startTime = performance.now();

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Fuzzy matching timeout exceeded'));
            }, opts.timeout);

            try {
                let suggestions: MergerSuggestion[];

                if (opts.enableBatchProcessing && dictionary.length > 100) {
                    // Use batch processing for large dictionaries
                    this.performBatchFuzzyMatching(
                        dictionary,
                        extractions,
                        opts,
                    )
                        .then((result) => {
                            // Add rare entities grouping if enabled
                            if (opts.autoGroupRareEntities) {
                                const rareEntities = this.identifyRareEntities(
                                    dictionary,
                                    extractions,
                                    opts.rareEntityThreshold,
                                );
                                const rareGrouping =
                                    this.createRareEntitiesGrouping(
                                        rareEntities,
                                        dictionary,
                                        extractions,
                                    );
                                if (rareGrouping) {
                                    result.unshift(rareGrouping); // Add at the beginning
                                }
                            }

                            clearTimeout(timeoutId);
                            this.updatePerformanceMetrics(startTime);
                            resolve(result);
                        })
                        .catch((error) => {
                            clearTimeout(timeoutId);
                            reject(error);
                        });
                } else {
                    // Use standard processing for smaller dictionaries
                    suggestions = this.performFuzzyMatching(
                        dictionary,
                        extractions,
                        opts,
                    );

                    // Add rare entities grouping if enabled
                    if (opts.autoGroupRareEntities) {
                        const rareEntities = this.identifyRareEntities(
                            dictionary,
                            extractions,
                            opts.rareEntityThreshold,
                        );
                        const rareGrouping = this.createRareEntitiesGrouping(
                            rareEntities,
                            dictionary,
                            extractions,
                        );
                        if (rareGrouping) {
                            suggestions.unshift(rareGrouping); // Add at the beginning
                        }
                    }

                    clearTimeout(timeoutId);
                    this.updatePerformanceMetrics(startTime);
                    resolve(suggestions);
                }
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
     * @throws Error if merger data is invalid or conflicts exist
     */
    applyMergers(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ): MergerResult {
        return this.applyMergersWithRollback(dictionary, extractions, mergers);
    }

    /**
     * Apply mergers with rollback capability on failure
     * @param dictionary Original dictionary array
     * @param extractions Original extractions 2D array
     * @param mergers Array of merger groups to apply
     * @returns Merged result with updated dictionary and extractions
     * @throws Error if merger data is invalid or conflicts exist
     */
    private applyMergersWithRollback(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ): MergerResult {
        // Validate input data first (before trying to copy potentially invalid data)
        this.validateMergerInputs(dictionary, extractions, mergers);

        // Check for conflicts between mergers
        this.validateMergerConflicts(mergers);

        // Store original data for potential rollback (after validation)
        const originalDictionary = [...dictionary];
        const originalExtractions = extractions.map((row) => [...row]);

        try {
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

            // Validate the merged result
            const result: MergerResult = {
                mergedDictionary,
                mergedExtractions,
                appliedMergers: mergers,
            };

            this.validateMergedResult(
                result,
                originalDictionary,
                originalExtractions,
            );

            return result;
        } catch (error) {
            // Rollback: return original data in case of any failure
            const rollbackResult: MergerResult = {
                mergedDictionary: originalDictionary,
                mergedExtractions: originalExtractions,
                appliedMergers: [],
            };

            // Re-throw the original error with rollback information
            const rollbackError = new Error(
                `Merger application failed and was rolled back: ${error instanceof Error ? error.message : String(error)}`,
            );
            // Note: cause property not available in older TypeScript versions
            (rollbackError as any).cause = error;
            throw rollbackError;
        }
    }

    /**
     * Safely apply mergers with detailed error reporting
     * @param dictionary Original dictionary array
     * @param extractions Original extractions 2D array
     * @param mergers Array of merger groups to apply
     * @returns Result object with success status and either merged data or error information
     */
    safeApplyMergers(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ):
        | { success: true; result: MergerResult }
        | {
              success: false;
              error: string;
              originalData: { dictionary: string[]; extractions: string[][] };
          } {
        try {
            const result = this.applyMergersWithRollback(
                dictionary,
                extractions,
                mergers,
            );
            return { success: true, result };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                originalData: {
                    dictionary: [...dictionary],
                    extractions: extractions.map((row) => [...row]),
                },
            };
        }
    }

    /**
     * Calculate similarity score between two strings using multiple strategies
     * Includes caching for performance optimization
     * @param item1 First string to compare
     * @param item2 Second string to compare
     * @param enableCaching Whether to use caching (default: true)
     * @returns Similarity score between 0.0 and 1.0
     */
    private calculateSimilarity(
        item1: string,
        item2: string,
        enableCaching: boolean = true,
    ): number {
        if (item1 === item2) return 1.0;

        const lower1 = item1.toLowerCase().trim();
        const lower2 = item2.toLowerCase().trim();

        if (lower1 === lower2) return 1.0;

        // Check cache first if enabled
        if (enableCaching) {
            const cacheKey = this.getCacheKey(lower1, lower2);
            const cached = this.getCachedSimilarity(cacheKey);
            if (cached !== null) {
                return cached;
            }

            // Calculate and cache the result
            const similarity = this.computeSimilarityScore(lower1, lower2);
            this.setCachedSimilarity(cacheKey, similarity);
            return similarity;
        }

        return this.computeSimilarityScore(lower1, lower2);
    }

    /**
     * Compute the actual similarity score without caching
     */
    private computeSimilarityScore(lower1: string, lower2: string): number {
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
        enableCaching: boolean = true,
    ): boolean {
        const similarity = this.calculateSimilarity(
            item1,
            item2,
            enableCaching,
        );
        return similarity >= threshold;
    }

    /**
     * Generate cache key for similarity calculation
     */
    private getCacheKey(item1: string, item2: string): string {
        // Ensure consistent ordering for cache key
        return item1 < item2 ? `${item1}|${item2}` : `${item2}|${item1}`;
    }

    /**
     * Get cached similarity score if available and not expired
     */
    private getCachedSimilarity(cacheKey: string): number | null {
        const entry = this.similarityCache.get(cacheKey);
        if (!entry) return null;

        const maxAge = DEFAULT_OPTIONS.cacheMaxAge || 300000;
        if (Date.now() - entry.timestamp > maxAge) {
            this.similarityCache.delete(cacheKey);
            return null;
        }

        return entry.similarity;
    }

    /**
     * Cache similarity score with timestamp
     */
    private setCachedSimilarity(cacheKey: string, similarity: number): void {
        this.similarityCache.set(cacheKey, {
            similarity,
            timestamp: Date.now(),
        });

        // Prevent cache from growing too large
        if (this.similarityCache.size > 10000) {
            this.cleanupCache();
        }
    }

    /**
     * Clean up old cache entries
     */
    private cleanupCache(): void {
        const maxAge = DEFAULT_OPTIONS.cacheMaxAge || 300000;
        const now = Date.now();

        for (const [key, entry] of this.similarityCache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.similarityCache.delete(key);
            }
        }
    }

    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics(startTime: number): void {
        this.performanceMetrics.totalProcessingTime =
            performance.now() - startTime;

        // Calculate cache hit rate
        const totalCacheAccess = this.similarityCache.size;
        if (totalCacheAccess > 0) {
            // This is a simplified calculation - in a real implementation,
            // you'd track hits vs misses more precisely
            this.performanceMetrics.cacheHitRate = Math.min(
                0.8,
                totalCacheAccess / 1000,
            );
        }
    }

    /**
     * Get current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Clear similarity cache
     */
    public clearCache(): void {
        this.similarityCache.clear();
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

                if (
                    this.shouldSuggestMerger(
                        item1,
                        item2,
                        options.threshold,
                        options.enableCaching,
                    )
                ) {
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
     * Perform batch fuzzy matching for large dictionaries
     */
    private async performBatchFuzzyMatching(
        dictionary: string[],
        extractions: string[][],
        options: FuzzyMatchOptions,
    ): Promise<MergerSuggestion[]> {
        const batchOptions =
            options.batchOptions || DEFAULT_OPTIONS.batchOptions!;
        const suggestions: MergerSuggestion[] = [];
        const processed = new Set<string>();

        // Create dictionary items with extraction counts
        const dictionaryItems = this.createDictionaryItems(
            dictionary,
            extractions,
        );

        // Create batches
        const batches: string[][] = [];
        for (let i = 0; i < dictionary.length; i += batchOptions.batchSize) {
            batches.push(dictionary.slice(i, i + batchOptions.batchSize));
        }

        // Process batches with concurrency control
        const semaphore = new Semaphore(batchOptions.maxConcurrentBatches);
        const batchPromises = batches.map(async (batch, batchIndex) => {
            await semaphore.acquire();

            try {
                const batchSuggestions = await this.processBatch(
                    batch,
                    dictionary,
                    dictionaryItems,
                    processed,
                    options,
                    batchIndex,
                );

                // Report progress if callback provided
                if (batchOptions.progressCallback) {
                    const processedCount =
                        (batchIndex + 1) * batchOptions.batchSize;
                    batchOptions.progressCallback(
                        Math.min(processedCount, dictionary.length),
                        dictionary.length,
                    );
                }

                return batchSuggestions;
            } finally {
                semaphore.release();
            }
        });

        const batchResults = await Promise.all(batchPromises);

        // Combine results from all batches
        for (const batchSuggestions of batchResults) {
            suggestions.push(...batchSuggestions);
            if (suggestions.length >= options.maxSuggestions) {
                break;
            }
        }

        this.performanceMetrics.batchesProcessed = batches.length;
        this.performanceMetrics.itemsProcessed = dictionary.length;

        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, options.maxSuggestions);
    }

    /**
     * Process a single batch of dictionary items
     */
    private async processBatch(
        batch: string[],
        fullDictionary: string[],
        dictionaryItems: Record<string, DictionaryItem>,
        processed: Set<string>,
        options: FuzzyMatchOptions,
        batchIndex: number,
    ): Promise<MergerSuggestion[]> {
        const suggestions: MergerSuggestion[] = [];

        for (const item1 of batch) {
            if (processed.has(item1)) continue;

            const similarItems: DictionaryItem[] = [dictionaryItems[item1]];

            // Compare with all items in the full dictionary (not just the batch)
            for (const item2 of fullDictionary) {
                if (item1 === item2 || processed.has(item2)) continue;

                if (
                    this.shouldSuggestMerger(
                        item1,
                        item2,
                        options.threshold,
                        options.enableCaching,
                    )
                ) {
                    similarItems.push(dictionaryItems[item2]);
                    processed.add(item2);
                }
            }

            if (similarItems.length > 1) {
                const suggestedItem = similarItems.reduce((prev, current) =>
                    current.extractionCount > prev.extractionCount
                        ? current
                        : prev,
                );

                const confidence = this.calculateGroupConfidence(similarItems);

                suggestions.push({
                    id: `batch_${batchIndex}_suggestion_${suggestions.length}`,
                    items: similarItems,
                    suggestedName: suggestedItem.name,
                    confidence,
                    reason: this.determineMatchReason(similarItems),
                });

                processed.add(item1);
            }
        }

        return suggestions;
    }

    /**
     * Create dictionary items with extraction counts and cell references from 3D array
     */
    private createDictionaryItemsFrom3D(
        dictionary: string[],
        extractions: string[][][],
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
                const cellMatches = row[colIndex];
                if (Array.isArray(cellMatches)) {
                    // Count unique matches in this cell
                    const uniqueMatches = new Set(cellMatches);
                    for (const match of uniqueMatches) {
                        if (items[match]) {
                            items[match].extractionCount++;
                            items[match].cellReferences.push(
                                `R${rowIndex + 1}C${colIndex + 1}`,
                            );
                        }
                    }
                }
            }
        }

        return items;
    }

    /**
     * Create dictionary items with extraction counts and cell references from 2D array
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

    /**
     * Validate input data for merger application
     * @param dictionary Original dictionary array
     * @param extractions Original extractions array
     * @param mergers Array of merger groups
     * @throws Error if input data is invalid
     */
    private validateMergerInputs(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ): void {
        // Validate dictionary
        if (!Array.isArray(dictionary)) {
            throw new Error('Dictionary must be an array');
        }

        // Validate extractions
        if (!Array.isArray(extractions)) {
            throw new Error('Extractions must be an array');
        }

        for (let i = 0; i < extractions.length; i++) {
            if (!Array.isArray(extractions[i])) {
                throw new Error(`Extractions row ${i} must be an array`);
            }
        }

        // Validate mergers
        if (!Array.isArray(mergers)) {
            throw new Error('Mergers must be an array');
        }

        for (let i = 0; i < mergers.length; i++) {
            const merger = mergers[i];
            if (!merger.id || typeof merger.id !== 'string') {
                throw new Error(`Merger ${i} must have a valid id`);
            }
            if (!merger.finalName || typeof merger.finalName !== 'string') {
                throw new Error(`Merger ${i} must have a valid finalName`);
            }
            if (!Array.isArray(merger.items) || merger.items.length < 2) {
                throw new Error(`Merger ${i} must have at least 2 items`);
            }
            if (!['automatic', 'manual'].includes(merger.type)) {
                throw new Error(
                    `Merger ${i} must have type 'automatic' or 'manual'`,
                );
            }

            // Validate each item in the merger
            for (let j = 0; j < merger.items.length; j++) {
                const item = merger.items[j];
                if (!item.name || typeof item.name !== 'string') {
                    throw new Error(
                        `Merger ${i}, item ${j} must have a valid name`,
                    );
                }
                if (!dictionary.includes(item.name)) {
                    throw new Error(
                        `Merger ${i}, item ${j} name "${item.name}" not found in dictionary`,
                    );
                }
            }
        }
    }

    /**
     * Validate that mergers don't conflict with each other
     * @param mergers Array of merger groups
     * @throws Error if conflicts are found
     */
    private validateMergerConflicts(mergers: MergerGroup[]): void {
        const itemToMergerMap = new Map<string, string>();

        for (const merger of mergers) {
            for (const item of merger.items) {
                const existingMergerId = itemToMergerMap.get(item.name);
                if (existingMergerId && existingMergerId !== merger.id) {
                    throw new Error(
                        `Conflict detected: Item "${item.name}" appears in multiple mergers (${existingMergerId} and ${merger.id})`,
                    );
                }
                itemToMergerMap.set(item.name, merger.id);
            }
        }

        // Check for duplicate merger IDs
        const mergerIds = new Set<string>();
        for (const merger of mergers) {
            if (mergerIds.has(merger.id)) {
                throw new Error(`Duplicate merger ID: ${merger.id}`);
            }
            mergerIds.add(merger.id);
        }
    }

    /**
     * Validate the integrity of merged results
     * @param result The merged result to validate
     * @param originalDictionary Original dictionary for comparison
     * @param originalExtractions Original extractions for comparison
     * @throws Error if merged result is invalid
     */
    private validateMergedResult(
        result: MergerResult,
        originalDictionary: string[],
        originalExtractions: string[][],
    ): void {
        // Validate merged dictionary structure
        if (!Array.isArray(result.mergedDictionary)) {
            throw new Error('Merged dictionary must be an array');
        }

        // Validate merged extractions structure
        if (!Array.isArray(result.mergedExtractions)) {
            throw new Error('Merged extractions must be an array');
        }

        if (result.mergedExtractions.length !== originalExtractions.length) {
            throw new Error(
                'Merged extractions must have same number of rows as original',
            );
        }

        for (let i = 0; i < result.mergedExtractions.length; i++) {
            if (!Array.isArray(result.mergedExtractions[i])) {
                throw new Error(`Merged extractions row ${i} must be an array`);
            }
            if (
                result.mergedExtractions[i].length !==
                originalExtractions[i].length
            ) {
                throw new Error(
                    `Merged extractions row ${i} must have same length as original`,
                );
            }
        }

        // Validate that all items in merged extractions exist in merged dictionary
        const mergedDictionarySet = new Set(result.mergedDictionary);
        for (let i = 0; i < result.mergedExtractions.length; i++) {
            for (let j = 0; j < result.mergedExtractions[i].length; j++) {
                const item = result.mergedExtractions[i][j];
                if (item && !mergedDictionarySet.has(item)) {
                    throw new Error(
                        `Merged extraction item "${item}" at row ${i}, col ${j} not found in merged dictionary`,
                    );
                }
            }
        }

        // Validate that merged dictionary doesn't contain duplicates
        const uniqueItems = new Set(result.mergedDictionary);
        if (uniqueItems.size !== result.mergedDictionary.length) {
            throw new Error('Merged dictionary contains duplicate items');
        }
    }

    /**
     * Resolve conflicts in overlapping mergers by prioritizing based on rules
     * @param mergers Array of potentially conflicting merger groups
     * @returns Array of resolved merger groups without conflicts
     */
    resolveConflictingMergers(mergers: MergerGroup[]): MergerGroup[] {
        const itemToMergerMap = new Map<string, MergerGroup>();
        const resolvedMergers: MergerGroup[] = [];
        const conflictGroups: { item: string; mergers: MergerGroup[] }[] = [];

        // Identify conflicts
        for (const merger of mergers) {
            for (const item of merger.items) {
                const existingMerger = itemToMergerMap.get(item.name);
                if (existingMerger && existingMerger.id !== merger.id) {
                    // Found a conflict
                    const existingConflict = conflictGroups.find(
                        (cg) => cg.item === item.name,
                    );
                    if (existingConflict) {
                        if (
                            !existingConflict.mergers.some(
                                (m) => m.id === merger.id,
                            )
                        ) {
                            existingConflict.mergers.push(merger);
                        }
                    } else {
                        conflictGroups.push({
                            item: item.name,
                            mergers: [existingMerger, merger],
                        });
                    }
                } else {
                    itemToMergerMap.set(item.name, merger);
                }
            }
        }

        // Resolve conflicts using priority rules
        const processedMergerIds = new Set<string>();

        for (const conflict of conflictGroups) {
            // Priority rule: automatic mergers take precedence over manual ones
            // If both are the same type, prefer the one with higher total extraction count
            const sortedMergers = conflict.mergers.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'automatic' ? -1 : 1;
                }
                const aCount = a.items.reduce(
                    (sum, item) => sum + item.extractionCount,
                    0,
                );
                const bCount = b.items.reduce(
                    (sum, item) => sum + item.extractionCount,
                    0,
                );
                return bCount - aCount;
            });

            const winningMerger = sortedMergers[0];
            if (!processedMergerIds.has(winningMerger.id)) {
                resolvedMergers.push(winningMerger);
                processedMergerIds.add(winningMerger.id);
            }
        }

        // Add non-conflicting mergers
        for (const merger of mergers) {
            if (!processedMergerIds.has(merger.id)) {
                const hasConflict = merger.items.some((item) =>
                    conflictGroups.some((cg) => cg.item === item.name),
                );
                if (!hasConflict) {
                    resolvedMergers.push(merger);
                }
            }
        }

        return resolvedMergers;
    }

    /**
     * Validate that a merger group is internally consistent
     * @param merger The merger group to validate
     * @throws Error if the merger is inconsistent
     */
    private validateMergerConsistency(merger: MergerGroup): void {
        // Check that all items in the merger are actually similar enough to be merged
        const threshold = 0.3; // Minimum similarity threshold for merger validation

        for (let i = 0; i < merger.items.length; i++) {
            for (let j = i + 1; j < merger.items.length; j++) {
                const similarity = this.calculateSimilarity(
                    merger.items[i].name,
                    merger.items[j].name,
                );
                if (similarity < threshold) {
                    throw new Error(
                        `Merger ${merger.id} contains items that are not similar enough: "${merger.items[i].name}" and "${merger.items[j].name}" (similarity: ${similarity.toFixed(3)})`,
                    );
                }
            }
        }

        // Validate that the final name is reasonable
        if (merger.finalName.trim().length === 0) {
            throw new Error(`Merger ${merger.id} has empty final name`);
        }

        // Check that the final name is similar to at least one of the items being merged
        const finalNameSimilarities = merger.items.map((item) =>
            this.calculateSimilarity(item.name, merger.finalName),
        );
        const maxSimilarity = Math.max(...finalNameSimilarities);

        if (maxSimilarity < threshold) {
            throw new Error(
                `Merger ${merger.id} final name "${merger.finalName}" is not similar enough to any of the merged items`,
            );
        }
    }

    /**
     * Apply mergers with enhanced validation and consistency checks
     * @param dictionary Original dictionary array
     * @param extractions Original extractions 2D array
     * @param mergers Array of merger groups to apply
     * @returns Merged result with updated dictionary and extractions
     */
    applyMergersWithValidation(
        dictionary: string[],
        extractions: string[][],
        mergers: MergerGroup[],
    ): MergerResult {
        // Enhanced validation including consistency checks
        for (const merger of mergers) {
            this.validateMergerConsistency(merger);
        }

        // Resolve any conflicts automatically
        const resolvedMergers = this.resolveConflictingMergers(mergers);

        // Apply the resolved mergers
        return this.applyMergersWithRollback(
            dictionary,
            extractions,
            resolvedMergers,
        );
    }
}

/**
 * Semaphore class for controlling concurrent batch processing
 */
class Semaphore {
    private permits: number;
    private waitQueue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<void> {
        return new Promise((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve();
            } else {
                this.waitQueue.push(resolve);
            }
        });
    }

    release(): void {
        this.permits++;
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            if (next) {
                this.permits--;
                next();
            }
        }
    }
}
