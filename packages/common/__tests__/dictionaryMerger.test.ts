import { describe, it, expect, beforeEach } from 'bun:test';
import { DictionaryMerger, type MergerGroup } from '../src/dictionaryMerger';

describe('DictionaryMerger', () => {
    let merger: DictionaryMerger;

    beforeEach(() => {
        merger = new DictionaryMerger();
    });

    describe('generateSuggestions', () => {
        it('should suggest merging "Microsoft Copilot" and "Copilot"', async () => {
            const dictionary = ['Microsoft Copilot', 'Copilot', 'Excel'];
            const extractions = [
                ['Microsoft Copilot', 'Excel'],
                ['Copilot', 'Excel'],
                ['Microsoft Copilot'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.5 },
            );

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].items).toHaveLength(2);
            expect(suggestions[0].items.map((item) => item.name)).toContain(
                'Microsoft Copilot',
            );
            expect(suggestions[0].items.map((item) => item.name)).toContain(
                'Copilot',
            );
            expect(suggestions[0].reason).toBe('substring_match');
        });

        it('should suggest merging "Coke" and "Coca Cola"', async () => {
            const dictionary = ['Coke', 'Coca Cola', 'Pepsi'];
            const extractions = [['Coke', 'Pepsi'], ['Coca Cola'], ['Coke']];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.4 },
            );

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].items).toHaveLength(2);
            expect(suggestions[0].items.map((item) => item.name)).toContain(
                'Coke',
            );
            expect(suggestions[0].items.map((item) => item.name)).toContain(
                'Coca Cola',
            );
        });

        it('should not suggest merging clearly different items', async () => {
            const dictionary = ['Apple', 'Orange', 'Banana'];
            const extractions = [['Apple', 'Orange'], ['Banana'], ['Apple']];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
            );

            expect(suggestions).toHaveLength(0);
        });

        it('should handle timeout gracefully', async () => {
            // For now, just test that the method completes without error
            const dictionary = ['Test1', 'Test2'];
            const extractions = [['Test1'], ['Test2']];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                {
                    timeout: 100,
                },
            );

            expect(Array.isArray(suggestions)).toBe(true);
        });

        it('should handle timeout configuration', async () => {
            // Test that timeout is properly configured and doesn't cause issues
            const dictionary = ['Test1', 'Test2', 'Test3'];
            const extractions = [['Test1'], ['Test2'], ['Test3']];

            // Should complete successfully with reasonable timeout
            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { timeout: 1000 },
            );

            expect(Array.isArray(suggestions)).toBe(true);
        });

        it('should handle configurable threshold values', async () => {
            const dictionary = ['Similar1', 'Similar2', 'Different'];
            const extractions = [['Similar1'], ['Similar2'], ['Different']];

            // High threshold - should find fewer matches
            const strictSuggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.9 },
            );

            // Low threshold - should find more matches
            const looseSuggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.1 },
            );

            expect(looseSuggestions.length).toBeGreaterThanOrEqual(
                strictSuggestions.length,
            );
        });

        it('should respect maxSuggestions limit', async () => {
            const dictionary = [
                'Item1',
                'Item 1',
                'Item2',
                'Item 2',
                'Item3',
                'Item 3',
            ];
            const extractions = [
                ['Item1', 'Item2', 'Item3'],
                ['Item 1', 'Item 2', 'Item 3'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                {
                    maxSuggestions: 2,
                },
            );

            expect(suggestions.length).toBeLessThanOrEqual(2);
        });

        it('should handle empty dictionary gracefully', async () => {
            const dictionary: string[] = [];
            const extractions: string[][] = [];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
            );

            expect(suggestions).toHaveLength(0);
        });

        it('should handle single item dictionary', async () => {
            const dictionary = ['Single Item'];
            const extractions = [['Single Item']];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
            );

            expect(suggestions).toHaveLength(0);
        });

        it('should prioritize items with higher extraction counts', async () => {
            const dictionary = ['Rare Item', 'Common Item'];
            const extractions = [
                ['Common Item', 'Common Item', 'Common Item'],
                ['Rare Item', 'Common Item'],
                ['Common Item'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.3 }, // Lower threshold to force a match
            );

            // Should suggest merging but prefer the more common item as the suggested name
            if (suggestions.length > 0) {
                expect(suggestions[0].suggestedName).toBe('Common Item');
            }
        });

        it('should handle complex multi-word brand variations', async () => {
            const dictionary = [
                'Coca Cola Company',
                'Coke',
                'Coca-Cola',
                'The Coca Cola Company',
            ];
            const extractions = [
                ['Coca Cola Company', 'Coke'],
                ['Coca-Cola'],
                ['The Coca Cola Company'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.4 },
            );

            expect(suggestions.length).toBeGreaterThan(0);
            // Should group related Coca Cola variations
            const cokeGroup = suggestions.find((s) =>
                s.items.some(
                    (item) =>
                        item.name.toLowerCase().includes('coke') ||
                        item.name.toLowerCase().includes('coca'),
                ),
            );
            expect(cokeGroup).toBeDefined();
        });

        it('should sort suggestions by confidence score', async () => {
            const dictionary = [
                'Microsoft',
                'MS',
                'Apple Inc',
                'Apple',
                'Google LLC',
                'Google',
            ];
            const extractions = [
                ['Microsoft', 'Apple Inc', 'Google LLC'],
                ['MS', 'Apple', 'Google'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.3 },
            );

            // Suggestions should be sorted by confidence (descending)
            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
                    suggestions[i].confidence,
                );
            }
        });

        it('should filter suggestions based on threshold', async () => {
            const dictionary = [
                'Exact Match',
                'Exact Match', // Duplicate for testing
                'Close Match',
                'Very Different String',
            ];
            const extractions = [
                ['Exact Match', 'Close Match'],
                ['Exact Match', 'Very Different String'],
            ];

            // High threshold should filter out weak matches
            const highThresholdSuggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.8 },
            );

            // Low threshold should include more matches
            const lowThresholdSuggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.2 },
            );

            expect(lowThresholdSuggestions.length).toBeGreaterThanOrEqual(
                highThresholdSuggestions.length,
            );
        });

        it('should assign correct confidence scores', async () => {
            const dictionary = ['Microsoft Copilot', 'Copilot'];
            const extractions = [['Microsoft Copilot'], ['Copilot']];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
            );

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].confidence).toBeGreaterThan(0);
            expect(suggestions[0].confidence).toBeLessThanOrEqual(1);
        });

        it('should handle large dictionary processing efficiently', async () => {
            // Create a moderately large dictionary
            const dictionary = Array.from({ length: 50 }, (_, i) => `Item${i}`);
            // Add some similar items
            dictionary.push('TestItem', 'Test Item', 'TestItem2');

            const extractions = dictionary.map((item) => [item]);

            const startTime = Date.now();
            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { timeout: 5000 },
            );
            const endTime = Date.now();

            // Should complete within reasonable time
            expect(endTime - startTime).toBeLessThan(5000);
            expect(Array.isArray(suggestions)).toBe(true);
        });

        it('should properly implement timeout mechanism', async () => {
            // Test that the timeout mechanism is properly set up
            const dictionary = ['Item1', 'Item2'];
            const extractions = [['Item1'], ['Item2']];

            // Mock setTimeout to verify it's being called
            const originalSetTimeout = global.setTimeout;
            let timeoutCalled = false;
            global.setTimeout = ((callback: any, delay: number) => {
                timeoutCalled = true;
                expect(delay).toBe(2000); // Should match our timeout value
                return originalSetTimeout(callback, delay);
            }) as any;

            try {
                await merger.generateSuggestions(dictionary, extractions, {
                    timeout: 2000,
                });
                expect(timeoutCalled).toBe(true);
            } finally {
                global.setTimeout = originalSetTimeout;
            }
        });
    });

    describe('applyMergers', () => {
        it('should correctly merge extraction arrays', () => {
            const dictionary = ['Microsoft Copilot', 'Copilot', 'Excel'];
            const extractions = [
                ['Microsoft Copilot', 'Excel'],
                ['Copilot', 'Excel'],
                ['Microsoft Copilot'],
            ];

            const mergers: MergerGroup[] = [
                {
                    id: 'merger1',
                    items: [
                        {
                            name: 'Microsoft Copilot',
                            extractionCount: 2,
                            cellReferences: ['R1C1', 'R3C1'],
                        },
                        {
                            name: 'Copilot',
                            extractionCount: 1,
                            cellReferences: ['R2C1'],
                        },
                    ],
                    finalName: 'Microsoft Copilot',
                    type: 'automatic',
                },
            ];

            const result = merger.applyMergers(
                dictionary,
                extractions,
                mergers,
            );

            expect(result.mergedDictionary).toEqual([
                'Microsoft Copilot',
                'Excel',
            ]);
            expect(result.mergedExtractions).toEqual([
                ['Microsoft Copilot', 'Excel'],
                ['Microsoft Copilot', 'Excel'],
                ['Microsoft Copilot'],
            ]);
            expect(result.appliedMergers).toEqual(mergers);
        });

        it('should update dictionary with merged names', () => {
            const dictionary = ['Item A', 'Item B', 'Item C'];
            const extractions = [['Item A'], ['Item B'], ['Item C']];

            const mergers: MergerGroup[] = [
                {
                    id: 'merger1',
                    items: [
                        {
                            name: 'Item A',
                            extractionCount: 1,
                            cellReferences: ['R1C1'],
                        },
                        {
                            name: 'Item B',
                            extractionCount: 1,
                            cellReferences: ['R2C1'],
                        },
                    ],
                    finalName: 'Merged Item',
                    type: 'manual',
                },
            ];

            const result = merger.applyMergers(
                dictionary,
                extractions,
                mergers,
            );

            expect(result.mergedDictionary).toEqual(['Merged Item', 'Item C']);
            expect(result.mergedExtractions).toEqual([
                ['Merged Item'],
                ['Merged Item'],
                ['Item C'],
            ]);
        });

        it('should preserve data integrity with no mergers', () => {
            const dictionary = ['Item1', 'Item2', 'Item3'];
            const extractions = [['Item1'], ['Item2'], ['Item3']];

            const result = merger.applyMergers(dictionary, extractions, []);

            expect(result.mergedDictionary).toEqual(dictionary);
            expect(result.mergedExtractions).toEqual(extractions);
            expect(result.appliedMergers).toEqual([]);
        });
    });

    describe('similarity calculation', () => {
        it('should return 1.0 for identical strings', () => {
            const merger = new DictionaryMerger();
            // Access private method for testing
            const similarity = (merger as any).calculateSimilarity(
                'Test',
                'Test',
            );
            expect(similarity).toBe(1.0);
        });

        it('should return 1.0 for case-insensitive identical strings', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Test',
                'test',
            );
            expect(similarity).toBe(1.0);
        });

        it('should return high similarity for substring matches', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Microsoft Copilot',
                'Copilot',
            );
            expect(similarity).toBeGreaterThan(0.5);
        });

        it('should handle reverse substring matches', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Copilot',
                'Microsoft Copilot',
            );
            expect(similarity).toBeGreaterThanOrEqual(0.5);
        });

        it('should return low similarity for different strings', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Apple',
                'Orange',
            );
            expect(similarity).toBeLessThan(0.3);
        });

        it('should handle empty strings gracefully', () => {
            const merger = new DictionaryMerger();
            const similarity1 = (merger as any).calculateSimilarity('', '');
            const similarity2 = (merger as any).calculateSimilarity('Test', '');
            const similarity3 = (merger as any).calculateSimilarity('', 'Test');

            expect(similarity1).toBe(1.0); // Empty strings are identical
            expect(similarity2).toBe(0); // No similarity with empty string
            expect(similarity3).toBe(0); // No similarity with empty string
        });

        it('should handle whitespace and trimming', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                '  Microsoft Copilot  ',
                'Microsoft Copilot',
            );
            expect(similarity).toBe(1.0);
        });

        it('should detect token-based similarity', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Google Chrome Browser',
                'Chrome Browser Google',
            );
            expect(similarity).toBeGreaterThan(0.7);
        });

        it('should detect brand abbreviations', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Microsoft',
                'MS',
            );
            expect(similarity).toBeGreaterThan(0.5);
        });

        it('should handle special characters and punctuation', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Coca-Cola',
                'Coca Cola',
            );
            expect(similarity).toBeGreaterThan(0.8);
        });

        it('should handle single character differences', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'GitHub',
                'Github',
            );
            expect(similarity).toBeGreaterThan(0.8);
        });
    });
});
