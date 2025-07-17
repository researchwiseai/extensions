import { expandInputsWithBlankRows } from '../expandInputsWithBlankRows';
import { Pos } from 'pulse-common';

describe('expandInputsWithBlankRows', () => {
    it('inserts blank entries for missing rows', () => {
        const inputs = ['a', 'b'];
        const positions: Pos[] = [
            { row: 1, col: 1 },
            { row: 3, col: 1 },
        ];
        const result = expandInputsWithBlankRows(inputs, positions);
        expect(result).toEqual(['a', '', 'b']);
    });
});
