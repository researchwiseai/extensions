import type { Theme } from 'pulse-common';
import { saveThemesToSheet } from './saveThemesToSheet';

// Mock the Excel object
const mockExcel = {
    HorizontalAlignment: {
        center: 'Center',
    },
    BorderLineStyle: {
        double: 'Double',
    },
};

// @ts-ignore - ensure global Excel matches mock interface
global.Excel = mockExcel;

describe('saveThemesToSheet', () => {
    function expectedHeadersFor(themes: Theme[]) {
        const repCount = Math.min(
            10,
            Math.max(0, ...themes.map((t) => t.representatives?.length ?? 0)),
        );
        return [
            'Label',
            'Short Label',
            'Description',
            ...Array.from(
                { length: repCount },
                (_, i) => `Representative ${i + 1}`,
            ),
        ];
    }
    function lastColForHeaders(headers: string[]) {
        const colIndex = headers.length; // 1-based
        return String.fromCharCode('A'.charCodeAt(0) + colIndex - 1);
    }

    let mockContext: any;
    let mockWorksheet: any;
    let mockHeaderRange: any;
    let mockDataRange: any;
    let mockUsedRange: any;
    let mockFormat: any;
    let mockBorders: any;
    let mockBorderItem: any;
    let mockFill: any;
    let mockFont: any;

    const mockThemes: Theme[] = [
        {
            label: 'Customer Service Quality',
            shortLabel: 'Service',
            description: 'Feedback related to the quality of customer service.',
            representatives: ['Great support', 'Helpful staff'],
        },
        {
            label: 'Product Features',
            shortLabel: 'Features',
            description: 'Comments on specific product features.',
            representatives: ['Needs more options', 'Love the new update'],
        },
    ];

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        mockBorderItem = { style: undefined };
        mockBorders = { getItem: jest.fn().mockReturnValue(mockBorderItem) };
        mockFill = { color: undefined };
        mockFont = { bold: undefined };
        mockFormat = {
            autofitColumns: jest.fn(),
            fill: mockFill,
            font: mockFont,
            horizontalAlignment: undefined,
            borders: mockBorders,
        };
        mockHeaderRange = undefined as any;
        mockDataRange = undefined as any;
        mockUsedRange = { clear: jest.fn() };
        mockWorksheet = {
            getRange: jest.fn().mockImplementation((address: string) => {
                const range = { values: undefined, format: mockFormat } as any;
                // Treat first row as header range by convention
                if (/^A1:.*1$/.test(address)) {
                    mockHeaderRange = range;
                } else {
                    mockDataRange = range;
                }
                return range;
            }),
            getUsedRange: jest.fn().mockReturnValue(mockUsedRange),
        };
        mockContext = {
            workbook: {
                worksheets: {
                    add: jest.fn().mockReturnValue(mockWorksheet),
                    getItem: jest.fn().mockReturnValue(mockWorksheet),
                },
            },
            sync: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('should create a new sheet if it does not exist and populate it with themes', async () => {
        await saveThemesToSheet({ context: mockContext, themes: mockThemes });

        expect(mockContext.workbook.worksheets.add).toHaveBeenCalledWith(
            'Themes',
        );
        expect(mockContext.workbook.worksheets.getItem).not.toHaveBeenCalled();
        expect(mockUsedRange.clear).not.toHaveBeenCalled();

        // Verify header creation and formatting
        const expectedHeaders = expectedHeadersFor(mockThemes);
        const lastCol = lastColForHeaders(expectedHeaders);
        const headerRangeStr = `A1:${lastCol}1`;
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(headerRangeStr);
        expect(mockHeaderRange.values).toEqual([expectedHeaders]);
        expect(mockFormat.fill.color).toBe('#D9EAD3');
        expect(mockFormat.font.bold).toBe(true);
        expect(mockFormat.horizontalAlignment).toBe(
            Excel.HorizontalAlignment.center,
        );
        expect(mockBorders.getItem).toHaveBeenCalledWith('EdgeBottom');
        expect(mockBorderItem.style).toBe(Excel.BorderLineStyle.double);

        // Verify data population
        const expectedDataRange = `A2:${lastCol}${mockThemes.length + 1}`;
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(expectedDataRange);
        // Build expected data rows padded to match header columns
        const expectedDataRows = mockThemes.map((theme) => {
            const row = [
                theme.label,
                theme.shortLabel,
                theme.description,
                ...theme.representatives,
            ];
            // pad remaining columns with empty strings
            row.push(...Array(expectedHeaders.length - row.length).fill(''));
            return row;
        });
        expect(mockDataRange.values).toEqual(expectedDataRows);

        // Verify autofit and sync calls
        expect(mockFormat.autofitColumns).toHaveBeenCalledTimes(2);
        expect(mockContext.sync).toHaveBeenCalledTimes(3);
    });

    it('should clear an existing sheet and populate it with new themes', async () => {
        // Simulate sheet already existing by making `add` throw an error
        mockContext.workbook.worksheets.add.mockImplementation(() => {
            throw new Error('Sheet already exists');
        });

        await saveThemesToSheet({ context: mockContext, themes: mockThemes });

        expect(mockContext.workbook.worksheets.add).toHaveBeenCalledWith(
            'Themes',
        );
        expect(mockContext.workbook.worksheets.getItem).toHaveBeenCalledWith(
            'Themes',
        );
        expect(mockWorksheet.getUsedRange).toHaveBeenCalled();
        expect(mockUsedRange.clear).toHaveBeenCalled();

        // Verify data population (same as the first test)
        const expectedHeaders = expectedHeadersFor(mockThemes);
        const lastCol = lastColForHeaders(expectedHeaders);
        const expectedDataRange = `A2:${lastCol}${mockThemes.length + 1}`;
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(expectedDataRange);
        expect(mockDataRange.values).not.toBeNull();

        expect(mockContext.sync).toHaveBeenCalledTimes(3);
    });

    it('should handle an empty array of themes', async () => {
        const emptyThemes: Theme[] = [];
        await saveThemesToSheet({ context: mockContext, themes: emptyThemes });

        expect(mockContext.workbook.worksheets.add).toHaveBeenCalledWith(
            'Themes',
        );

        // Headers should still be written
        const expectedHeaders = expectedHeadersFor(emptyThemes);
        const lastCol = lastColForHeaders(expectedHeaders);
        const headerRangeStr = `A1:${lastCol}1`;
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(headerRangeStr);
        expect(mockHeaderRange.values).toEqual([expectedHeaders]);

        // When there are no rows, only header is written
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(`A1:${lastCol}1`);
        expect(mockContext.sync).toHaveBeenCalledTimes(2);
    });
});
