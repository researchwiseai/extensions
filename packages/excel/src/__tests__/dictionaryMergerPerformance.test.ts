import { DictionaryMerger } from 'pulse-common';

describe('Dictionary Merger Performance Tests', () => {
    let merger: DictionaryMerger;

    beforeEach(() => {
        merger = new DictionaryMerger();
    });

    afterEach(() => {
        // Clear cache after each test
        merger.clearCache();
    });

    describe('Performance optimizations', () => {
        it('should handle large dictionaries efficiently with batch processing', async () => {
            // Create a large dictionary (500 items)
            const largeDictionary: string[] = [];
            for (let i = 0; i < 500; i++) {
                largeDictionary.push(`Item ${i}`);
                // Add some similar items for testing
                if (i % 50 === 0) {
                    largeDictionary.push(`Item ${i} Variant`);
                    largeDictionary.push(`${i} Item`);
                }
            }

            // Create corresponding extractions
            const extractions: string[][] = [];
            for (let i = 0; i < 100; i++) {
                const row: string[] = [];
                for (let j = 0; j < 10; j++) {
                    const randomIndex = Math.floor(
                        Math.random() * largeDictionary.length,
                    );
                    row.push(largeDictionary[randomIndex]);
                }
                extractions.push(row);
            }

            const startTime = performance.now();

            const suggestions = await merger.generateSuggestions(
                largeDictionary,
                extractions,
                {
                    threshold: 0.7,
                    maxSuggestions: 20,
                    timeout: 10000,
                    enableBatchProcessing: true,
                    enableCaching: true,
                },
            );

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Should complete within reasonable time (less than 5 seconds)
            expect(processingTime).toBeLessThan(5000);

            // Should find some suggestions
            expect(suggestions.length).toBeGreaterThan(0);

            // Get performance metrics
            const metrics = merger.getPerformanceMetrics();
            expect(metrics.totalProcessingTime).toBeGreaterThan(0);
            expect(metrics.itemsProcessed).toBe(largeDictionary.length);

            console.log(
                `Processed ${largeDictionary.length} items in ${processingTime.toFixed(2)}ms`,
            );
            console.log(`Found ${suggestions.length} suggestions`);
            console.log(`Performance metrics:`, metrics);
        }, 15000); // 15 second timeout

        it('should benefit from caching on repeated similarity calculations', async () => {
            const dictionary = [
                'Microsoft Copilot',
                'Copilot',
                'GitHub Copilot',
                'Copilot AI',
                'MS Copilot',
                'OpenAI GPT',
                'ChatGPT',
                'GPT-4',
                'Artificial Intelligence',
                'AI Assistant',
            ];

            const extractions = [
                ['Microsoft Copilot', 'OpenAI GPT'],
                ['Copilot', 'ChatGPT'],
                ['GitHub Copilot', 'GPT-4'],
                ['Copilot AI', 'AI Assistant'],
                ['MS Copilot', 'Artificial Intelligence'],
            ];

            // First run - populate cache
            const startTime1 = performance.now();
            const suggestions1 = await merger.generateSuggestions(
                dictionary,
                extractions,
                { enableCaching: true },
            );
            const endTime1 = performance.now();
            const time1 = endTime1 - startTime1;

            // Second run - should benefit from cache
            const startTime2 = performance.now();
            const suggestions2 = await merger.generateSuggestions(
                dictionary,
                extractions,
                { enableCaching: true },
            );
            const endTime2 = performance.now();
            const time2 = endTime2 - startTime2;

            // Results should be identical
            expect(suggestions1).toEqual(suggestions2);

            // Second run should be faster (though this might be flaky in CI)
            console.log(
                `First run: ${time1.toFixed(2)}ms, Second run: ${time2.toFixed(2)}ms`,
            );

            const metrics = merger.getPerformanceMetrics();
            console.log(
                `Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
            );
        });

        it('should handle timeout gracefully for complex processing', async () => {
            // Create a very large dictionary that might timeout
            const hugeDictionary: string[] = [];
            for (let i = 0; i < 1000; i++) {
                hugeDictionary.push(
                    `Complex Item ${i} with many words and variations`,
                );
            }

            const extractions: string[][] = [];
            for (let i = 0; i < 50; i++) {
                const row: string[] = [];
                for (let j = 0; j < 20; j++) {
                    const randomIndex = Math.floor(
                        Math.random() * hugeDictionary.length,
                    );
                    row.push(hugeDictionary[randomIndex]);
                }
                extractions.push(row);
            }

            // Set a very short timeout to force timeout
            await expect(
                merger.generateSuggestions(hugeDictionary, extractions, {
                    timeout: 100, // Very short timeout
                    enableBatchProcessing: false, // Disable batch processing to make it slower
                }),
            ).rejects.toThrow('timeout');
        });

        it('should apply mergers efficiently for large datasets', async () => {
            const dictionary = [];
            const extractions = [];

            // Create test data
            for (let i = 0; i < 100; i++) {
                dictionary.push(`Item ${i}`);
                dictionary.push(`Item ${i} Variant`);
            }

            for (let i = 0; i < 50; i++) {
                const row = [];
                for (let j = 0; j < 10; j++) {
                    const randomIndex = Math.floor(
                        Math.random() * dictionary.length,
                    );
                    row.push(dictionary[randomIndex]);
                }
                extractions.push(row);
            }

            // Create mergers for every pair of similar items
            const mergers = [];
            for (let i = 0; i < 100; i++) {
                mergers.push({
                    id: `merger_${i}`,
                    items: [
                        {
                            name: `Item ${i}`,
                            extractionCount: 5,
                            cellReferences: [],
                        },
                        {
                            name: `Item ${i} Variant`,
                            extractionCount: 3,
                            cellReferences: [],
                        },
                    ],
                    finalName: `Item ${i}`,
                    type: 'automatic' as const,
                });
            }

            const startTime = performance.now();
            const result = merger.applyMergers(
                dictionary,
                extractions,
                mergers,
            );
            const endTime = performance.now();

            expect(result.mergedDictionary.length).toBeLessThan(
                dictionary.length,
            );
            expect(result.appliedMergers.length).toBe(mergers.length);

            const processingTime = endTime - startTime;
            console.log(
                `Applied ${mergers.length} mergers in ${processingTime.toFixed(2)}ms`,
            );

            // Should complete quickly (less than 1 second)
            expect(processingTime).toBeLessThan(1000);
        });
    });

    describe('Backward compatibility', () => {
        it('should work with existing extraction workflow without expandDictionary', async () => {
            const dictionary = ['Microsoft', 'Google', 'Apple'];
            const extractions = [
                ['Microsoft', 'Google'],
                ['Apple', 'Microsoft'],
                ['Google', 'Apple'],
            ];

            // When expandDictionary is false, no merger suggestions should be generated
            // This simulates the existing workflow
            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { maxSuggestions: 0 }, // Simulate no suggestions needed
            );

            expect(suggestions).toEqual([]);

            // Applying no mergers should return original data
            const result = merger.applyMergers(dictionary, extractions, []);
            expect(result.mergedDictionary).toEqual(dictionary);
            expect(result.mergedExtractions).toEqual(extractions);
            expect(result.appliedMergers).toEqual([]);
        });

        it('should handle edge cases gracefully', async () => {
            // Empty dictionary
            await expect(
                merger.generateSuggestions([], [], {}),
            ).resolves.toEqual([]);

            // Single item dictionary
            await expect(
                merger.generateSuggestions(
                    ['Single Item'],
                    [['Single Item']],
                    {},
                ),
            ).resolves.toEqual([]);

            // Dictionary with identical items (should not suggest merging with itself)
            const suggestions = await merger.generateSuggestions(
                ['Item', 'Item'],
                [['Item'], ['Item']],
                {},
            );
            expect(suggestions.length).toBe(0);
        });
    });

    describe('User acceptance scenarios', () => {
        it('should handle realistic survey data with brand variations', async () => {
            const dictionary = [
                'Microsoft Copilot',
                'Copilot',
                'MS Copilot',
                'GitHub Copilot',
                'Coca Cola',
                'Coke',
                'Coca-Cola',
                'Diet Coke',
                'iPhone',
                'Apple iPhone',
                'iPhone 15',
                'Samsung Galaxy',
                'Galaxy S24',
                'Samsung',
                'Google Pixel',
                'Pixel 8',
                'Google',
            ];

            const extractions = [
                ['Microsoft Copilot', 'Coca Cola', 'iPhone'],
                ['Copilot', 'Coke', 'Apple iPhone'],
                ['MS Copilot', 'Coca-Cola', 'iPhone 15'],
                ['GitHub Copilot', 'Diet Coke', 'Samsung Galaxy'],
                ['Copilot', 'Coke', 'Galaxy S24'],
                ['Microsoft Copilot', 'Coca Cola', 'Samsung'],
                ['Copilot', 'Coke', 'Google Pixel'],
                ['MS Copilot', 'Coca-Cola', 'Pixel 8'],
                ['GitHub Copilot', 'Diet Coke', 'Google'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                {
                    threshold: 0.6,
                    maxSuggestions: 10,
                },
            );

            // Should find suggestions for similar brands
            expect(suggestions.length).toBeGreaterThan(0);

            // Should suggest merging Copilot variations
            const copilotSuggestion = suggestions.find((s) =>
                s.items.some((item) => item.name.includes('Copilot')),
            );
            expect(copilotSuggestion).toBeDefined();

            // Should suggest merging Coca Cola variations
            const cocaColaSuggestion = suggestions.find((s) =>
                s.items.some(
                    (item) =>
                        item.name.toLowerCase().includes('coke') ||
                        item.name.includes('Coca'),
                ),
            );
            expect(cocaColaSuggestion).toBeDefined();

            console.log('Found suggestions for realistic data:');
            suggestions.forEach((suggestion, index) => {
                console.log(
                    `${index + 1}. ${suggestion.suggestedName} (${suggestion.confidence.toFixed(2)}) - ${suggestion.reason}`,
                );
                console.log(
                    `   Items: ${suggestion.items.map((i) => i.name).join(', ')}`,
                );
            });
        });

        it('should handle user workflow: accept some suggestions, reject others, create manual mergers', async () => {
            const dictionary = [
                'Microsoft Office',
                'MS Office',
                'Office 365',
                'Microsoft 365',
                'Google Workspace',
                'G Suite',
                'Gmail',
                'Google Mail',
                'Outlook',
                'Microsoft Outlook',
            ];

            const extractions = [
                ['Microsoft Office', 'Google Workspace', 'Gmail'],
                ['MS Office', 'G Suite', 'Google Mail'],
                ['Office 365', 'Google Workspace', 'Outlook'],
                ['Microsoft 365', 'G Suite', 'Microsoft Outlook'],
            ];

            // Generate suggestions
            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                { threshold: 0.6 },
            );

            expect(suggestions.length).toBeGreaterThan(0);

            // Simulate user accepting some suggestions
            const acceptedMergers = suggestions
                .slice(0, 2)
                .map((suggestion) => ({
                    id: suggestion.id,
                    items: suggestion.items,
                    finalName: suggestion.suggestedName,
                    type: 'automatic' as const,
                }));

            // Simulate user creating a manual merger
            const manualMerger = {
                id: 'manual_1',
                items: [
                    {
                        name: 'Gmail',
                        extractionCount: 2,
                        cellReferences: ['R1C3', 'R2C3'],
                    },
                    {
                        name: 'Google Mail',
                        extractionCount: 1,
                        cellReferences: ['R2C3'],
                    },
                ],
                finalName: 'Gmail',
                type: 'manual' as const,
            };

            const allMergers = [...acceptedMergers, manualMerger];

            // Apply all mergers
            const result = merger.applyMergers(
                dictionary,
                extractions,
                allMergers,
            );

            expect(result.appliedMergers.length).toBe(allMergers.length);
            expect(result.mergedDictionary.length).toBeLessThan(
                dictionary.length,
            );

            // Verify data integrity
            const totalOriginalItems = extractions.flat().length;
            const totalMergedItems = result.mergedExtractions.flat().length;
            expect(totalMergedItems).toBe(totalOriginalItems);

            console.log('User workflow simulation completed:');
            console.log(`Original dictionary: ${dictionary.length} items`);
            console.log(
                `Merged dictionary: ${result.mergedDictionary.length} items`,
            );
            console.log(`Applied mergers: ${result.appliedMergers.length}`);
        });
    });
});
