import { readThemesFromSheet } from './readThemesFromSheet';
import type { Theme } from 'pulse-common';

// Mock the global Excel and OfficeExtension objects provided by the Office JS API runtime
const mockExcelRun = jest.fn();
global.Excel = {
    run: mockExcelRun,
} as any;

// Mock the OfficeExtension.Error constructor for `instanceof` checks
class MockOfficeExtensionError extends Error {
    code: string;
    constructor(message: string, code: string) {
        super(message);
        this.name = 'OfficeExtension.Error';
        this.code = code;
    }
}
global.OfficeExtension = {
    Error: MockOfficeExtensionError,
} as any;

// Spy on console methods to verify they are called correctly
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

describe('readThemesFromSheet', () => {
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it('should read and parse themes correctly from a sheet with valid data', async () => {
        const mockValues = [
            [
                'Label',
                'Short Label',
                'Description',
                'Representative 1',
                'Representative 2',
            ],
            ['Theme 1', 'T1', 'Desc 1', 'Rep A', 'Rep B'],
            ['Theme 2', 'T2', 'Desc 2', 'Rep C', ''],
            ['Theme 3', 'T3', 'Desc 3', 'Rep 3', null], // Test empty/null reps
            ['Theme 4', 'T4', 'Desc 4', 'Rep D', 'Rep E'], // This row should be filtered out
            ['Theme 5', 'T5', 'Desc 5', 'Rep F', undefined],
        ];

        mockExcelRun.mockImplementation(async (callback) => {
            const context = {
                workbook: {
                    worksheets: {
                        getItem: jest.fn().mockReturnValue({
                            getUsedRange: jest.fn().mockReturnValue({
                                load: jest.fn(),
                                values: mockValues,
                            }),
                        }),
                    },
                },
                sync: jest.fn().mockResolvedValue(undefined),
            };
            return callback(context);
        });

        const expectedThemes: Theme[] = [
            {
                label: 'Theme 1',
                shortLabel: 'T1',
                description: 'Desc 1',
                representatives: ['Rep A', 'Rep B'],
            },
            {
                label: 'Theme 2',
                shortLabel: 'T2',
                description: 'Desc 2',
                representatives: ['Rep C'],
            },
            {
                label: 'Theme 3',
                shortLabel: 'T3',
                description: 'Desc 3',
                representatives: ['Rep 3'],
            },
            {
                label: 'Theme 4',
                shortLabel: 'T4',
                description: 'Desc 4',
                representatives: ['Rep D', 'Rep E'],
            },
            {
                label: 'Theme 5',
                shortLabel: 'T5',
                description: 'Desc 5',
                representatives: ['Rep F'],
            },
        ];

        await expect(readThemesFromSheet()).resolves.toEqual(expectedThemes);
    });

    it('should return basic themes as strings when data format is invalid', async () => {
        const mockValues = [
            ['Label', 'Short Label', 'Description', 'Rep 1', 'Rep 2'],
            ['Valid Theme', 'VT', 'Valid Desc', 'Rep A', 'Rep B'],
            ['Invalid Theme', 123, 'Invalid because of number', 'Rep C', ''],
        ];

        mockExcelRun.mockImplementation(async (callback) => {
            const context = {
                workbook: {
                    worksheets: {
                        getItem: jest.fn().mockReturnValue({
                            getUsedRange: jest.fn().mockReturnValue({
                                load: jest.fn(),
                                values: mockValues,
                            }),
                        }),
                    },
                },
                sync: jest.fn().mockResolvedValue(undefined),
            };
            return callback(context);
        });

        const expectedShortThemes = [
            {
                label: 'Valid Theme',
                representatives: ['Valid Theme'],
            },
            {
                label: 'Invalid Theme',
                representatives: ['Invalid Theme'],
            },
        ];

        await expect(readThemesFromSheet('InvalidDataSheet')).resolves.toEqual(
            expectedShortThemes,
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Sheet "InvalidDataSheet" contains invalid data. Returning basic themes as strings.',
        );
    });

    it('should throw a specific error if the sheet is not found', async () => {
        mockExcelRun.mockImplementation(async (callback) => {
            const context = {
                workbook: {
                    worksheets: {
                        getItem: jest.fn().mockImplementation(() => {
                            throw new MockOfficeExtensionError(
                                'Sheet "NonExistentSheet" not found. Please create it and add themes.',
                                'ItemNotFound',
                            );
                        }),
                    },
                },
                sync: jest.fn(),
            };
            return callback(context);
        });

        await expect(readThemesFromSheet('NonExistentSheet')).rejects.toThrow(
            'Sheet "NonExistentSheet" not found. Please create it and add themes.',
        );
    });

    it('should throw an error if the sheet is empty', async () => {
        mockExcelRun.mockImplementation(async (callback) => {
            const context = {
                workbook: {
                    worksheets: {
                        getItem: jest.fn().mockReturnValue({
                            getUsedRange: jest.fn().mockReturnValue({
                                load: jest.fn(),
                                values: [],
                            }),
                        }),
                    },
                },
                sync: jest.fn().mockResolvedValue(undefined),
            };
            return callback(context);
        });

        await expect(readThemesFromSheet('EmptySheet')).rejects.toThrow(
            'Sheet "EmptySheet" is empty or has no data rows.',
        );
    });

    it('should throw an error if the sheet only has a header row', async () => {
        const mockValues = [['Header1', 'Header2']];
        mockExcelRun.mockImplementation(async (callback) => {
            const context = {
                workbook: {
                    worksheets: {
                        getItem: jest.fn().mockReturnValue({
                            getUsedRange: jest.fn().mockReturnValue({
                                load: jest.fn(),
                                values: mockValues,
                            }),
                        }),
                    },
                },
                sync: jest.fn().mockResolvedValue(undefined),
            };
            return callback(context);
        });

        await expect(readThemesFromSheet('HeaderOnlySheet')).rejects.toThrow(
            'Sheet "HeaderOnlySheet" is empty or has no data rows.',
        );
    });

    it('should log and re-throw generic errors from the Excel API', async () => {
        const genericError = new Error('A generic Excel API error');
        mockExcelRun.mockImplementation(async () => {
            throw genericError;
        });

        await expect(readThemesFromSheet()).rejects.toThrow(genericError);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error reading themes from sheet:',
            genericError,
        );
    });

    it('should use the provided sheet name instead of the default', async () => {
        const mockGetItem = jest.fn().mockReturnValue({
            getUsedRange: jest.fn().mockReturnValue({
                load: jest.fn(),
                values: [['Header'], ['Data']],
            }),
        });

        mockExcelRun.mockImplementation(async (callback) => {
            const context = {
                workbook: { worksheets: { getItem: mockGetItem } },
                sync: jest.fn().mockResolvedValue(undefined),
            };
            return callback(context);
        });

        await readThemesFromSheet('MyCustomThemes');
        expect(mockGetItem).toHaveBeenCalledWith('MyCustomThemes');
    });
});
