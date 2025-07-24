import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { Pos } from 'pulse-common';

describe('expandWithBlankRows', () => {
    it('inserts blank entries for missing rows', () => {
        const inputs = ['a', 'b'];
        const positions: Pos[] = [
            { row: 1, col: 1 },
            { row: 3, col: 1 },
        ];
        const result = expandWithBlankRows(inputs, positions);
        expect(result).toEqual(['a', '', 'b']);
    });
});
