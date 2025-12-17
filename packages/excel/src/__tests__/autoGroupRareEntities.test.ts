import { DictionaryMerger } from 'pulse-common/dictionaryMerger';

describe('Auto-group Rare Entities', () => {
    let merger: DictionaryMerger;

    beforeEach(() => {
        merger = new DictionaryMerger();
    });

    describe('identifyRareEntitiesFrom3D', () => {
        it('should identify entities with less than 0.5% frequency', () => {
            const dictionary = [
                'Apple',
                'Microsoft',
                'Google',
                'RareEntity1',
                'RareEntity2',
            ];

            // Create 3D extractions: 100 rows x 5 columns = 500 total cells
            // Apple appears 100 times (20%), Microsoft 50 times (10%), Google 25 times (5%)
            // RareEntity1 appears 2 times (0.4%), RareEntity2 appears 1 time (0.2%)
            const extractions: string[][][] = [];

            for (let i = 0; i < 100; i++) {
                const row: string[][] = [];
                for (let j = 0; j < 5; j++) {
                    if (i < 100 && j === 0) {
                        row.push(['Apple']); // Apple in column 0 for all 100 rows
                    } else if (i < 50 && j === 1) {
                        row.push(['Microsoft']); // Microsoft in column 1 for first 50 rows
                    } else if (i < 25 && j === 2) {
                        row.push(['Google']); // Google in column 2 for first 25 rows
                    } else if (i === 0 && j === 3) {
                        row.push(['RareEntity1']); // RareEntity1 appears only once
                    } else if (i === 1 && j === 3) {
                        row.push(['RareEntity1']); // RareEntity1 appears second time
                    } else if (i === 0 && j === 4) {
                        row.push(['RareEntity2']); // RareEntity2 appears only once
                    } else {
                        row.push([]); // Empty cell
                    }
                }
                extractions.push(row);
            }

            const rareEntities = merger.identifyRareEntitiesFrom3D(
                dictionary,
                extractions,
                0.005,
            );

            expect(rareEntities).toContain('RareEntity1');
            expect(rareEntities).toContain('RareEntity2');
            expect(rareEntities).not.toContain('Apple');
            expect(rareEntities).not.toContain('Microsoft');
            expect(rareEntities).not.toContain('Google');
        });

        it('should return empty array when no rare entities exist', () => {
            const dictionary = ['Apple', 'Microsoft'];
            const extractions: string[][][] = [
                [['Apple'], ['Microsoft']],
                [['Apple'], ['Microsoft']],
            ];

            const rareEntities = merger.identifyRareEntitiesFrom3D(
                dictionary,
                extractions,
                0.005,
            );

            expect(rareEntities).toEqual([]);
        });
    });

    describe('createRareEntitiesGroupingFrom3D', () => {
        it('should create a grouping suggestion for rare entities', () => {
            const dictionary = ['Apple', 'RareEntity1', 'RareEntity2'];
            const extractions: string[][][] = [
                [['Apple'], ['RareEntity1'], []],
                [['Apple'], [], ['RareEntity2']],
            ];

            const rareEntities = ['RareEntity1', 'RareEntity2'];
            const grouping = merger.createRareEntitiesGroupingFrom3D(
                rareEntities,
                dictionary,
                extractions,
            );

            expect(grouping).not.toBeNull();
            expect(grouping!.suggestedName).toBe('Other');
            expect(grouping!.items).toHaveLength(2);
            expect(grouping!.items.map((item) => item.name)).toEqual([
                'RareEntity1',
                'RareEntity2',
            ]);
            expect(grouping!.confidence).toBe(1.0);
            expect(grouping!.reason).toBe('auto_other');
        });

        it('should return null when less than 2 rare entities', () => {
            const dictionary = ['Apple', 'RareEntity1'];
            const extractions: string[][][] = [[['Apple'], ['RareEntity1']]];

            const rareEntities = ['RareEntity1'];
            const grouping = merger.createRareEntitiesGroupingFrom3D(
                rareEntities,
                dictionary,
                extractions,
            );

            expect(grouping).toBeNull();
        });

        it('should create auto_other suggestion with maximum confidence', () => {
            const dictionary = ['Apple', 'RareEntity1', 'RareEntity2'];
            const extractions: string[][][] = [
                [['Apple'], ['RareEntity1'], []],
                [['Apple'], [], ['RareEntity2']],
            ];

            const rareEntities = ['RareEntity1', 'RareEntity2'];
            const grouping = merger.createRareEntitiesGroupingFrom3D(
                rareEntities,
                dictionary,
                extractions,
            );

            expect(grouping).not.toBeNull();
            expect(grouping!.reason).toBe('auto_other');
            expect(grouping!.confidence).toBe(1.0);
            expect(grouping!.id).toBe('auto_rare_entities_group');
        });
    });
});
