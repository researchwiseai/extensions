import { DictionaryMerger } from 'pulse-common';

describe('Dictionary Merger Complete Workflow', () => {
    let merger: DictionaryMerger;

    beforeEach(() => {
        merger = new DictionaryMerger();
    });

    it('should complete the full merger workflow successfully', async () => {
        // Test data representing a realistic scenario
        const dictionary = [
            'Microsoft Copilot',
            'Copilot',
            'MS Copilot',
            'GitHub Copilot',
            'Coca Cola',
            'Coke',
            'Coca-Cola',
            'iPhone',
            'Apple iPhone',
            'Samsung Galaxy',
            'Galaxy S24',
        ];

        const extractions = [
            ['Microsoft Copilot', 'Coca Cola', 'iPhone'],
            ['Copilot', 'Coke', 'Apple iPhone'],
            ['MS Copilot', 'Coca-Cola', 'Samsung Galaxy'],
            ['GitHub Copilot', 'Coke', 'Galaxy S24'],
            ['Copilot', 'Coca Cola', 'iPhone'],
        ];

        // Step 1: Generate suggestions
        const suggestions = await merger.generateSuggestions(
            dictionary,
            extractions,
            {
                threshold: 0.6,
                maxSuggestions: 10,
                timeout: 5000,
            },
        );

        expect(suggestions.length).toBeGreaterThan(0);
        console.log(`Generated ${suggestions.length} suggestions`);

        // Step 2: Simulate user accepting some suggestions
        const acceptedMergers = suggestions
            .slice(0, Math.min(3, suggestions.length))
            .map((suggestion) => ({
                id: suggestion.id,
                items: suggestion.items,
                finalName: suggestion.suggestedName,
                type: 'automatic' as const,
            }));

        // Step 3: Apply mergers
        const result = merger.applyMergers(
            dictionary,
            extractions,
            acceptedMergers,
        );

        // Verify results
        expect(result.mergedDictionary.length).toBeLessThan(dictionary.length);
        expect(result.appliedMergers.length).toBe(acceptedMergers.length);
        expect(result.mergedExtractions.length).toBe(extractions.length);

        // Verify data integrity - total number of items should be preserved
        const originalItemCount = extractions.flat().length;
        const mergedItemCount = result.mergedExtractions.flat().length;
        expect(mergedItemCount).toBe(originalItemCount);

        console.log('Workflow completed successfully:');
        console.log(`- Original dictionary: ${dictionary.length} items`);
        console.log(
            `- Merged dictionary: ${result.mergedDictionary.length} items`,
        );
        console.log(`- Applied mergers: ${result.appliedMergers.length}`);
        console.log(`- Data integrity preserved: ${originalItemCount} items`);
    });

    it('should handle edge cases gracefully', async () => {
        // Test with empty data
        let result = await merger.generateSuggestions([], [], {});
        expect(result).toEqual([]);

        // Test with single item
        result = await merger.generateSuggestions(['Single'], [['Single']], {});
        expect(result).toEqual([]);

        // Test applying no mergers
        const mergeResult = merger.applyMergers(['A', 'B'], [['A'], ['B']], []);
        expect(mergeResult.mergedDictionary).toEqual(['A', 'B']);
        expect(mergeResult.mergedExtractions).toEqual([['A'], ['B']]);
        expect(mergeResult.appliedMergers).toEqual([]);
    });

    it('should maintain backward compatibility', async () => {
        // Simulate existing workflow without merger functionality
        const dictionary = ['Microsoft', 'Google', 'Apple'];
        const extractions = [
            ['Microsoft', 'Google'],
            ['Apple', 'Microsoft'],
            ['Google', 'Apple'],
        ];

        // When no suggestions are requested (maxSuggestions: 0)
        const suggestions = await merger.generateSuggestions(
            dictionary,
            extractions,
            { maxSuggestions: 0 },
        );

        expect(suggestions).toEqual([]);

        // Original data should be preserved when no mergers are applied
        const result = merger.applyMergers(dictionary, extractions, []);
        expect(result.mergedDictionary).toEqual(dictionary);
        expect(result.mergedExtractions).toEqual(extractions);
    });

    it('should handle realistic survey data', async () => {
        // Simulate real survey responses about software tools
        const dictionary = [
            'Microsoft Office',
            'MS Office',
            'Office 365',
            'Microsoft 365',
            'Google Workspace',
            'G Suite',
            'Slack',
            'Microsoft Teams',
            'Teams',
            'Zoom',
            'Zoom Meetings',
            'Adobe Photoshop',
            'Photoshop',
            'Adobe Creative Suite',
        ];

        const extractions = [
            ['Microsoft Office', 'Slack', 'Zoom'],
            ['MS Office', 'Microsoft Teams', 'Adobe Photoshop'],
            ['Office 365', 'Teams', 'Photoshop'],
            ['Microsoft 365', 'Slack', 'Zoom Meetings'],
            ['Google Workspace', 'Microsoft Teams', 'Adobe Creative Suite'],
            ['G Suite', 'Teams', 'Photoshop'],
            ['Microsoft Office', 'Slack', 'Adobe Photoshop'],
            ['MS Office', 'Microsoft Teams', 'Zoom'],
            ['Office 365', 'Teams', 'Adobe Creative Suite'],
        ];

        const suggestions = await merger.generateSuggestions(
            dictionary,
            extractions,
            { threshold: 0.6 },
        );

        expect(suggestions.length).toBeGreaterThan(0);

        // Should find Office variations
        const officeSuggestion = suggestions.find((s) =>
            s.items.some((item) => item.name.toLowerCase().includes('office')),
        );
        expect(officeSuggestion).toBeDefined();

        // Should find Teams variations
        const teamsSuggestion = suggestions.find((s) =>
            s.items.some((item) => item.name.toLowerCase().includes('teams')),
        );
        expect(teamsSuggestion).toBeDefined();

        // Apply all suggestions and verify
        const allMergers = suggestions.map((suggestion) => ({
            id: suggestion.id,
            items: suggestion.items,
            finalName: suggestion.suggestedName,
            type: 'automatic' as const,
        }));

        const result = merger.applyMergers(dictionary, extractions, allMergers);

        expect(result.mergedDictionary.length).toBeLessThan(dictionary.length);
        expect(result.appliedMergers.length).toBe(allMergers.length);

        // Verify no data loss
        const originalCount = extractions.flat().length;
        const mergedCount = result.mergedExtractions.flat().length;
        expect(mergedCount).toBe(originalCount);

        console.log('Survey data processing:');
        console.log(
            `- Reduced ${dictionary.length} items to ${result.mergedDictionary.length}`,
        );
        console.log(`- Applied ${result.appliedMergers.length} mergers`);
        console.log(`- Preserved ${originalCount} data points`);
    });
});
