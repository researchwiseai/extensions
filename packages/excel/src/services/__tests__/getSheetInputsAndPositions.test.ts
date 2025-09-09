import { getSheetInputsAndPositions } from '../getSheetInputsAndPositions';

/** Mocks for basic Excel range objects */
interface MockRange {
    rowIndex: number;
    columnIndex: number;
    rowCount: number;
    columnCount: number;
    values?: any[][];
    load: jest.Mock;
    getIntersectionOrNullObject?: (
        other: MockRange,
    ) => MockRange & { isNullObject?: boolean };
}

function createRange(props: Partial<MockRange> = {}): MockRange {
    return {
        rowIndex: 0,
        columnIndex: 0,
        rowCount: 1,
        columnCount: 1,
        load: jest.fn(),
        ...props,
    } as MockRange;
}

describe('getSheetInputsAndPositions', () => {
    it('returns positions using used range intersection for column selection', async () => {
        const values = [['foo'], [null], ['bar']];

        const intersection = createRange({
            rowIndex: 0,
            columnIndex: 0,
            rowCount: values.length,
            columnCount: 1,
            values,
        }) as MockRange & { isNullObject?: boolean };
        intersection.isNullObject = false;

        const target = createRange({
            getIntersectionOrNullObject: jest.fn(() => intersection),
        });

        const sheet = {
            getRange: jest.fn(() => target),
            getUsedRange: jest.fn(() => createRange()),
            getRangeByIndexes: jest.fn(() => createRange({ values })),
        } as any;

        const context = {
            workbook: {
                worksheets: {
                    getActiveWorksheet: jest.fn(() => sheet),
                },
            },
            sync: jest.fn().mockResolvedValue(undefined),
        } as any;

        const { inputs, positions } = await getSheetInputsAndPositions(
            context,
            'A:A',
        );
        expect(target.getIntersectionOrNullObject).toHaveBeenCalled();
        expect(inputs).toEqual(['foo', 'bar']);
        expect(positions).toEqual([
            { row: 1, col: 1 },
            { row: 3, col: 1 },
        ]);
    });

    it('throws if more than one column is selected', async () => {
        const values = [['a', 'b']];

        const intersection = createRange({
            rowIndex: 0,
            columnIndex: 0,
            rowCount: 1,
            columnCount: 2,
            values,
        }) as MockRange & { isNullObject?: boolean };
        intersection.isNullObject = false;

        const target = createRange({
            getIntersectionOrNullObject: jest.fn(() => intersection),
        });

        const sheet = {
            getRange: jest.fn(() => target),
            getUsedRange: jest.fn(() => createRange()),
            getRangeByIndexes: jest.fn(() => createRange({ values })),
        } as any;

        const context = {
            workbook: {
                worksheets: {
                    getActiveWorksheet: jest.fn(() => sheet),
                },
            },
            sync: jest.fn().mockResolvedValue(undefined),
        } as any;

        await expect(
            getSheetInputsAndPositions(context, 'A:B'),
        ).rejects.toThrow('single column');
    });
});
