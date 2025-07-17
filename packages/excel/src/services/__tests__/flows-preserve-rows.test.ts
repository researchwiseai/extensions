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
        const outputSheet = {
            getCell: jest.fn((r: number, c: number) => {
                const cell = { values: undefined };
                cellMocks.push({ r, c, cell });
                return cell;
            }),
            getRange: jest.fn(() => ({
                values: undefined,
                getResizedRange: jest.fn(() => ({ values: undefined })),
            })),
            getRangeByIndexes: jest.fn(() => ({ values: undefined })),
        } as any;
        const context = {
            workbook: { worksheets: { add: jest.fn(() => outputSheet) } },
            sync: jest.fn().mockResolvedValue(undefined),
        } as any;
        (getSheetInputsAndPositions as jest.Mock).mockResolvedValue({
            inputs: ['one two', 'three'],
            positions: [
                { row: 1, col: 1 },
                { row: 3, col: 1 },
            ],
            sheet: {
                getRangeByIndexes: jest.fn(() => ({ load: jest.fn(), values: [['one two'], ['',], ['three']] })),
            },
            rangeInfo: { rowIndex: 0, columnIndex: 0, rowCount: 3, columnCount: 1 },
        });

        await countWordsFlow(context, 'A:A');

        expect(context.workbook.worksheets.add).toHaveBeenCalled();
        expect(cellMocks[0].r).toBe(1);
        expect(cellMocks[1].r).toBe(3);
        expect(cellMocks[0].cell.values).toEqual([[2]]);
        expect(cellMocks[1].cell.values).toEqual([[1]]);
    });
});
