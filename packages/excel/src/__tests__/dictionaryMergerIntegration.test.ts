import { jest } from '@jest/globals';
import {
    DictionaryMerger,
    type MergerResult,
    type MergerGroup,
} from 'pulse-common/dictionaryMerger';

// Mock Office.js APIs
const mockOffice = {
    context: {
        ui: {
            displayDialogAsync: jest.fn(
                (url: any, options: any, callback: any) => {},
            ),
        },
    },
    AsyncResultStatus: {
        Succeeded: 'succeeded',
        Failed: 'failed',
    },
    EventType: {
        DialogMessageReceived: 'dialogMessageReceived',
        DialogEventReceived: 'dialogEventReceived',
    },
};

// Mock range data that can be modified per test
let mockRangeData = {
    values: [
        ['Input Text'],
        ['Microsoft Copilot is great'],
        ['I love using Copilot'],
        ['Excel is powerful'],
    ],
    rowCount: 4,
    columnCount: 1,
    rowIndex: 0,
    columnIndex: 0,
    address: 'A1:A4',
};

const mockRange = {
    load: jest.fn(() => {}),
    get values() {
        return mockRangeData.values;
    },
    set values(val) {
        mockRangeData.values = val;
    },
    get rowCount() {
        return mockRangeData.rowCount;
    },
    get columnCount() {
        return mockRangeData.columnCount;
    },
    get rowIndex() {
        return mockRangeData.rowIndex;
    },
    get columnIndex() {
        return mockRangeData.columnIndex;
    },
    get address() {
        return mockRangeData.address;
    },
};

const mockWorksheet = {
    getUsedRange: jest.fn(() => mockRange),
    getRangeByIndexes: jest.fn(() => mockRange),
};

const mockExcel = {
    run: jest.fn(async (callback: any) => {
        const mockContext = {
            workbook: {
                worksheets: {
                    getItem: jest.fn(() => mockWorksheet),
                    getActiveWorksheet: jest.fn(() => mockWorksheet),
                },
            },
            sync: jest.fn(async () => {}),
        };
        return await callback(mockContext);
    }),
};

// Mock the extractElements API
const mockExtractElementsApi = jest.fn(
    async (inputs: string[], options: any) => {
        return {
            dictionary: ['Microsoft Copilot', 'Copilot', 'Excel'],
            results: [
                [['Microsoft Copilot'], [], ['Excel']],
                [[], ['Copilot'], []],
                [[], [], ['Excel']],
            ],
        };
    },
);

// Set up global mocks
(global as any).Office = mockOffice;
(global as any).Excel = mockExcel;

// Mock the API import
jest.mock('pulse-common/api', () => ({
    extractElements: mockExtractElementsApi,
}));

// Import the module under test after setting up mocks
import { extractElementsFromWorksheet } from '../extractElements';

describe('Dictionary Merger Integration Tests', () => {
    let consoleSpy: any;
    let merger: DictionaryMerger;

    beforeEach(() => {
        // Reset all mocks
        mockOffice.context.ui.displayDialogAsync.mockClear();
        mockExcel.run.mockClear();
        mockExtractElementsApi.mockClear();
        mockWorksheet.getUsedRange.mockClear();
        mockWorksheet.getRangeByIndexes.mockClear();
        mockRange.load.mockClear();

        // Reset mock range data to default
        mockRangeData = {
            values: [
                ['Input Text'],
                ['Microsoft Copilot is great'],
                ['I love using Copilot'],
                ['Excel is powerful'],
            ],
            rowCount: 4,
            columnCount: 1,
            rowIndex: 0,
            columnIndex: 0,
            address: 'A1:A4',
        };

        // Reset API mock to default behavior
        mockExtractElementsApi.mockResolvedValue({
            dictionary: ['Microsoft Copilot', 'Copilot', 'Excel'],
            results: [
                [['Microsoft Copilot'], [], ['Excel']],
                [[], ['Copilot'], []],
                [[], [], ['Excel']],
            ],
        });

        // Reset worksheet mock to not throw by default
        mockWorksheet.getRangeByIndexes.mockReturnValue(mockRange);

        // Spy on console methods
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(() => {}),
            error: jest.spyOn(console, 'error').mockImplementation(() => {}),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
            info: jest.spyOn(console, 'info').mockImplementation(() => {}),
        };

        merger = new DictionaryMerger();
    });

    afterEach(() => {
        // Restore console methods
        consoleSpy.log.mockRestore();
        consoleSpy.error.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.info.mockRestore();
    });

    describe('End-to-end merger workflow', () => {
        it('should complete extraction workflow without merger when expandDictionary is false', async () => {
            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Microsoft', 'Excel'],
                expandDictionary: false,
            };

            await extractElementsFromWorksheet(options);

            // Should call the extraction API
            expect(mockExtractElementsApi).toHaveBeenCalledWith(
                [
                    'Microsoft Copilot is great',
                    'I love using Copilot',
                    'Excel is powerful',
                ],
                expect.objectContaining({
                    category: 'entity',
                    dictionary: ['Microsoft', 'Excel'],
                    expandDictionary: false,
                    fast: false,
                }),
            );

            // Should not attempt to open dialog when expandDictionary is false
            expect(
                mockOffice.context.ui.displayDialogAsync,
            ).not.toHaveBeenCalled();

            // Should write results to sheet
            expect(mockWorksheet.getRangeByIndexes).toHaveBeenCalled();
        });

        it('should complete extraction workflow without merger when no suggestions found', async () => {
            // Mock API to return dictionary with no similar items
            mockExtractElementsApi.mockResolvedValueOnce({
                dictionary: ['Apple', 'Orange', 'Banana'],
                results: [
                    [['Apple'], [], []],
                    [[], ['Orange'], []],
                    [[], [], ['Banana']],
                ],
            });

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Apple', 'Orange', 'Banana'],
                expandDictionary: true,
            };

            await extractElementsFromWorksheet(options);

            // Should call the extraction API
            expect(mockExtractElementsApi).toHaveBeenCalled();

            // Should not open dialog when no suggestions are found
            expect(
                mockOffice.context.ui.displayDialogAsync,
            ).not.toHaveBeenCalled();

            // Should log appropriate message
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.stringContaining(
                    'No similar items found for automatic merging',
                ),
            );
        });

        it('should handle merger process errors gracefully', async () => {
            // Mock DictionaryMerger to throw an error
            const originalGenerateSuggestions =
                DictionaryMerger.prototype.generateSuggestions;
            DictionaryMerger.prototype.generateSuggestions = jest.fn(
                async () => {
                    throw new Error('Merger process failed');
                },
            );

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Microsoft Copilot', 'Copilot'],
                expandDictionary: true,
            };

            await extractElementsFromWorksheet(options);

            // Should log the error
            expect(consoleSpy.error).toHaveBeenCalledWith(
                'Error in merger process:',
                expect.any(Error),
            );

            // Should show error notification
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('Merger process encountered an error'),
            );

            // Should still write original data
            expect(mockWorksheet.getRangeByIndexes).toHaveBeenCalled();

            // Restore original method
            DictionaryMerger.prototype.generateSuggestions =
                originalGenerateSuggestions;
        });
    });

    describe('Error scenarios and fallback behaviors', () => {
        it('should handle empty worksheet gracefully', async () => {
            // Mock empty worksheet
            mockRangeData.values = [];
            mockRangeData.rowCount = 0;
            mockRangeData.columnCount = 0;

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Test'],
                expandDictionary: true,
            };

            await expect(extractElementsFromWorksheet(options)).rejects.toThrow(
                'Worksheet appears to be empty',
            );
        });

        it('should handle worksheet with no input texts', async () => {
            // Mock worksheet with header but no data
            mockRangeData.values = [['Input Text']];
            mockRangeData.rowCount = 1;
            mockRangeData.columnCount = 1;

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Test'],
                expandDictionary: true,
            };

            await expect(extractElementsFromWorksheet(options)).rejects.toThrow(
                'No input texts found in column A',
            );
        });

        it('should handle API extraction failure', async () => {
            mockExtractElementsApi.mockRejectedValueOnce(
                new Error('API Error'),
            );

            const options = {
                sheetName: null,
                hasHeader: false, // No header so we have input data
                dictionary: ['Test'],
                expandDictionary: true,
            };

            await expect(extractElementsFromWorksheet(options)).rejects.toThrow(
                'API Error',
            );
        });

        it('should handle complete sheet writing failure', async () => {
            // Mock all sheet writing to fail
            mockWorksheet.getRangeByIndexes.mockImplementation(() => {
                throw new Error('Complete sheet write failure');
            });

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Test'],
                expandDictionary: false,
            };

            await expect(extractElementsFromWorksheet(options)).rejects.toThrow(
                'Failed to write headers: Complete sheet write failure',
            );

            expect(consoleSpy.error).toHaveBeenCalledWith(
                'Error writing headers to sheet:',
                expect.any(Error),
            );
        });
    });

    describe('Data validation and integrity', () => {
        it('should validate extraction result structure before writing', async () => {
            // Mock API to return invalid result structure
            mockExtractElementsApi.mockResolvedValueOnce({
                dictionary: null,
                results: [] as string[][][],
            });

            const options = {
                sheetName: null,
                hasHeader: false, // No header so we have input data
                dictionary: ['Test'],
                expandDictionary: false,
            };

            await expect(extractElementsFromWorksheet(options)).rejects.toThrow(
                'Invalid result data structure',
            );
        });

        it('should handle various input text formats correctly', async () => {
            // Mock worksheet with various input formats
            mockRangeData.values = [
                ['Input Text'],
                ['  Microsoft Copilot  '], // With whitespace
                [''], // Empty cell
                [null], // Null cell
                ['Copilot'], // Normal text
                ['123'], // Number as string
            ];
            mockRangeData.rowCount = 6;

            // Mock API to return immediately to avoid timeout
            mockExtractElementsApi.mockResolvedValueOnce({
                dictionary: ['Microsoft Copilot', 'Copilot'],
                results: [
                    [['Microsoft Copilot'], []],
                    [[], ['Copilot']],
                    [[], []],
                ],
            });

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Microsoft Copilot', 'Copilot'],
                expandDictionary: false, // Disable merger to avoid timeout
            };

            await extractElementsFromWorksheet(options);

            // Should call API with cleaned inputs (excluding empty/null)
            expect(mockExtractElementsApi).toHaveBeenCalledWith(
                ['Microsoft Copilot', 'Copilot', '123'], // Trimmed and converted to string
                expect.any(Object),
            );
        });

        it('should handle duplicate dictionary items correctly', async () => {
            // Mock API to return immediately to avoid timeout
            mockExtractElementsApi.mockResolvedValueOnce({
                dictionary: ['Test', 'Another'],
                results: [
                    [['Test'], []],
                    [[], ['Another']],
                    [[], []],
                ],
            });

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Test', 'Test', 'Another', 'Test'], // Duplicates
                expandDictionary: false, // Disable merger to avoid timeout
            };

            await extractElementsFromWorksheet(options);

            // Should deduplicate dictionary before sending to API
            expect(mockExtractElementsApi).toHaveBeenCalledWith(
                expect.any(Array),
                expect.objectContaining({
                    dictionary: ['Test', 'Another'], // Deduplicated
                }),
            );
        });
    });

    describe('Dialog integration scenarios', () => {
        it('should handle dialog opening failure gracefully', async () => {
            // Mock dialog opening failure
            mockOffice.context.ui.displayDialogAsync.mockImplementation(
                (url: any, options: any, callback: any) => {
                    callback({
                        status: mockOffice.AsyncResultStatus.Failed,
                        error: {
                            code: 12007,
                            message: 'Dialog blocked by popup blocker',
                        },
                    });
                },
            );

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Microsoft Copilot', 'Copilot'],
                expandDictionary: true,
            };

            await extractElementsFromWorksheet(options);

            // Should log the error
            expect(consoleSpy.error).toHaveBeenCalledWith(
                'Failed to open merger dialog:',
                expect.any(Object),
            );

            // Should log fallback message
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining('Dialog blocked by popup blocker'),
            );

            // Should still complete extraction with original data
            expect(mockWorksheet.getRangeByIndexes).toHaveBeenCalled();
        });

        it('should handle successful dialog workflow', async () => {
            // Mock successful dialog opening
            const mockDialog = {
                addEventHandler: jest.fn(() => {}),
                messageChild: jest.fn(() => {}),
                close: jest.fn(() => {}),
            };

            mockOffice.context.ui.displayDialogAsync.mockImplementation(
                (url: any, options: any, callback: any) => {
                    // Simulate async dialog opening
                    setTimeout(() => {
                        callback({
                            status: mockOffice.AsyncResultStatus.Succeeded,
                            value: mockDialog,
                        });
                    }, 1);
                },
            );

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Microsoft Copilot', 'Copilot'],
                expandDictionary: true,
            };

            // Start the extraction
            const extractionPromise = extractElementsFromWorksheet(options);

            // Wait for dialog to be set up
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Should have opened the dialog
            expect(
                mockOffice.context.ui.displayDialogAsync,
            ).toHaveBeenCalledWith(
                '/modal/Modal.html',
                expect.objectContaining({
                    height: 80,
                    width: 60,
                    promptBeforeOpen: false,
                }),
                expect.any(Function),
            );

            // Should have set up event handlers
            expect(mockDialog.addEventHandler).toHaveBeenCalledTimes(2);

            // Simulate dialog ready and completion
            if (mockDialog.addEventHandler.mock.calls.length >= 2) {
                const messageHandlerCall =
                    mockDialog.addEventHandler.mock.calls.find(
                        (call: any[]) =>
                            call.length > 0 &&
                            call[0] ===
                                mockOffice.EventType.DialogMessageReceived,
                    );

                const messageHandler =
                    messageHandlerCall &&
                    Array.isArray(messageHandlerCall) &&
                    messageHandlerCall.length > 1
                        ? ((messageHandlerCall as any[])[1] as any)
                        : null;

                if (messageHandler) {
                    // Send ready message
                    messageHandler({
                        message: JSON.stringify({ type: 'ready' }),
                    });

                    // Send completion message
                    messageHandler({
                        message: JSON.stringify({
                            type: 'dictionary-merger-complete',
                            result: null, // User cancelled
                        }),
                    });
                }
            }

            await extractionPromise;

            // Should still write data to sheet
            expect(mockWorksheet.getRangeByIndexes).toHaveBeenCalled();
        });
    });

    describe('User notification system', () => {
        it('should provide appropriate success messages', async () => {
            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Test'],
                expandDictionary: false,
            };

            await extractElementsFromWorksheet(options);

            // The success message is logged via console.log, not console.info
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Extraction completed successfully with',
                ),
            );
        });

        it('should handle notification errors gracefully', async () => {
            // Mock console.log to throw an error (since success messages use console.log)
            consoleSpy.log.mockImplementation(() => {
                throw new Error('Console error');
            });

            const options = {
                sheetName: null,
                hasHeader: true,
                dictionary: ['Test'],
                expandDictionary: false,
            };

            // Should not throw despite console error - the showUserNotification function has error handling
            await extractElementsFromWorksheet(options);

            // Should have attempted to log and caught the error
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                'Failed to show user notification:',
                expect.any(Error),
            );
        });
    });

    describe('Auto-other rare entity grouping', () => {
        it('should automatically accept auto_other suggestions', async () => {
            const dictionary = [
                'Apple',
                'Microsoft',
                'RareEntity1',
                'RareEntity2',
            ];

            // Create a large dataset where rare entities appear very infrequently
            const extractions = [];

            // Add 200 rows where Apple and Microsoft appear frequently
            for (let i = 0; i < 200; i++) {
                extractions.push(['Apple', 'Microsoft', '', '']);
            }

            // Add just 1 occurrence each for rare entities (0.25% frequency each)
            extractions.push(['', '', 'RareEntity1', '']);
            extractions.push(['', '', '', 'RareEntity2']);

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                {
                    autoGroupRareEntities: true,
                    rareEntityThreshold: 0.01, // 1% threshold - rare entities are at 0.25% each
                },
            );

            // Should have an auto_other suggestion
            const autoOtherSuggestion = suggestions.find(
                (s) => s.reason === 'auto_other',
            );
            expect(autoOtherSuggestion).toBeDefined();
            expect(autoOtherSuggestion!.suggestedName).toBe('Other');
            expect(autoOtherSuggestion!.confidence).toBe(1.0);
            expect(autoOtherSuggestion!.items.map((item) => item.name)).toEqual(
                expect.arrayContaining(['RareEntity1', 'RareEntity2']),
            );
        });

        it('should not create auto_other suggestion when autoGroupRareEntities is disabled', async () => {
            const dictionary = [
                'Apple',
                'Microsoft',
                'RareEntity1',
                'RareEntity2',
            ];
            const extractions = [
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                ['Apple', 'Microsoft', '', ''],
                // Add rare entities with very low frequency
                ['', '', 'RareEntity1', ''],
                ['', '', '', 'RareEntity2'],
            ];

            const suggestions = await merger.generateSuggestions(
                dictionary,
                extractions,
                {
                    autoGroupRareEntities: false, // Disabled
                    rareEntityThreshold: 0.01, // 1% threshold
                },
            );

            // Should not have any auto_other suggestions
            const autoOtherSuggestions = suggestions.filter(
                (s) => s.reason === 'auto_other',
            );
            expect(autoOtherSuggestions).toHaveLength(0);
        });
    });
});
