import { countWordsFlow } from '../../flows/countWords';
import { getSheetInputsAndPositions } from '../getSheetInputsAndPositions';

jest.mock('../getSheetInputsAndPositions');

jest.mock('wink-nlp', () => {
    return () => ({
        readDoc: (text: string) => ({
            tokens: () => ({
                out: () => text.split(/\s+/).filter(Boolean),
            }),
        }),
    });
});
jest.mock('wink-eng-lite-web-model', () => ({}));

describe('flows writing', () => {
    it('preserves empty rows when writing results', async () => {
        const cellMocks: any[] = [];
        const sheet = {
            getCell: jest.fn((r: number, c: number) => {
                const cell = { values: undefined };
                cellMocks.push({ r, c, cell });
                return cell;
            }),
        } as any;
        (getSheetInputsAndPositions as jest.Mock).mockResolvedValue({
            inputs: ['one two', 'three'],
            positions: [
                { row: 1, col: 1 }, // row 1
                { row: 3, col: 1 }, // row 3 (row 2 empty)
            ],
            sheet,
        });

        const context = { sync: jest.fn().mockResolvedValue(undefined) } as any;
        await countWordsFlow(context, 'A:A');

        expect(cellMocks[0].r).toBe(0);
        expect(cellMocks[1].r).toBe(2);
        expect(cellMocks[0].cell.values).toEqual([[2]]);
        expect(cellMocks[1].cell.values).toEqual([[1]]);
    });
});
