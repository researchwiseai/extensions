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

// @ts-expect-error - Mocking the global Excel object
global.Excel = mockExcel;

describe('saveThemesToSheet', () => {
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
        mockHeaderRange = { values: undefined, format: mockFormat };
        mockDataRange = { values: undefined, format: mockFormat };
        mockUsedRange = { clear: jest.fn() };
        mockWorksheet = {
            getRange: jest
                .fn()
                .mockImplementation((address: string) =>
                    address === 'A1:E1' ? mockHeaderRange : mockDataRange,
                ),
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
        expect(mockWorksheet.getRange).toHaveBeenCalledWith('A1:E1');
        expect(mockHeaderRange.values).toEqual([
            [
                'Label',
                'Short Label',
                'Description',
                'Representative 1',
                'Representative 2',
            ],
        ]);
        expect(mockFormat.fill.color).toBe('#D9EAD3');
        expect(mockFormat.font.bold).toBe(true);
        expect(mockFormat.horizontalAlignment).toBe(
            Excel.HorizontalAlignment.center,
        );
        expect(mockBorders.getItem).toHaveBeenCalledWith('EdgeBottom');
        expect(mockBorderItem.style).toBe(Excel.BorderLineStyle.double);

        // Verify data population
        const expectedDataRange = `A2:E${mockThemes.length + 1}`;
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(expectedDataRange);
        expect(mockDataRange.values).toEqual([
            [
                'Customer Service Quality',
                'Service',
                'Feedback related to the quality of customer service.',
                'Great support',
                'Helpful staff',
            ],
            [
                'Product Features',
                'Features',
                'Comments on specific product features.',
                'Needs more options',
                'Love the new update',
            ],
        ]);

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
        const expectedDataRange = `A2:E${mockThemes.length + 1}`;
        expect(mockWorksheet.getRange).toHaveBeenCalledWith(expectedDataRange);
        expect(mockDataRange.values).not.toBeNull();

        expect(mockContext.sync).toHaveBeenCalledTimes(3);
    });

    it('should handle an empty array of themes', async () => {
        await saveThemesToSheet({ context: mockContext, themes: [] });

        expect(mockContext.workbook.worksheets.add).toHaveBeenCalledWith(
            'Themes',
        );

        // Headers should still be written
        expect(mockWorksheet.getRange).toHaveBeenCalledWith('A1:E1');
        expect(mockHeaderRange.values).toEqual([
            [
                'Label',
                'Short Label',
                'Description',
                'Representative 1',
                'Representative 2',
            ],
        ]);

        // Data range should be called with an empty array
        expect(mockWorksheet.getRange).toHaveBeenCalledWith('A2:E1');
        expect(mockDataRange.values).toEqual([]);

        expect(mockContext.sync).toHaveBeenCalledTimes(3);
    });
});
