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

        it('should return high similarity for substring matches', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Microsoft Copilot',
                'Copilot',
            );
            expect(similarity).toBeGreaterThan(0.5);
        });

        it('should return low similarity for different strings', () => {
            const merger = new DictionaryMerger();
            const similarity = (merger as any).calculateSimilarity(
                'Apple',
                'Orange',
            );
            expect(similarity).toBeLessThan(0.3);
        });
    });
});
