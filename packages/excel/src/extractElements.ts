import { extractElements as extractElementsApi } from 'pulse-common/api';
import { DictionaryMerger, MergerResult } from 'pulse-common/dictionaryMerger';
import { getRelativeUrl } from './services/relativeUrl';

/**
 * Show the dictionary merger dialog and return the merger result
 * @param dictionary Array of dictionary items
 * @param extractions 2D array of extraction results
 * @param autoGroupRareEntities Whether to enable auto-grouping of rare entities
 * @returns Promise resolving to MergerResult or null if cancelled
 */
async function showMergerDialog(
    dictionary: string[],
    extractions: string[][],
    autoGroupRareEntities: boolean = false,
): Promise<MergerResult | null> {
    return new Promise((resolve, reject) => {
        try {
            // Create dialog options
            const dialogOptions: Office.DialogOptions = {
                height: 80,
                width: 60,
                promptBeforeOpen: false,
            };

            // Open the modal dialog
            Office.context.ui.displayDialogAsync(
                getRelativeUrl('Modal.html'),
                dialogOptions,
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Failed) {
                        console.error(
                            'Failed to open merger dialog:',
                            result.error,
                        );

                        // Provide specific error messages based on error code
                        let errorMessage =
                            'Failed to open dictionary merger dialog';
                        if (result.error) {
                            switch (result.error.code) {
                                case 12007:
                                    errorMessage =
                                        'Dialog blocked by popup blocker or security settings';
                                    break;
                                case 12008:
                                    errorMessage =
                                        'Dialog URL is not accessible';
                                    break;
                                case 12009:
                                    errorMessage =
                                        'Dialog size exceeds screen dimensions';
                                    break;
                                default:
                                    errorMessage = `Dialog error (${result.error.code}): ${result.error.message}`;
                            }
                        }

                        console.warn(
                            `Dictionary merger dialog fallback: ${errorMessage}`,
                        );
                        resolve(null); // Graceful fallback
                        return;
                    }

                    const dialog = result.value;
                    let isResolved = false;

                    // Handle messages from the dialog
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        (arg) => {
                            try {
                                if ('error' in arg) {
                                    console.error(
                                        'Error in dialog message:',
                                        arg.error,
                                    );
                                    if (!isResolved) {
                                        isResolved = true;
                                        dialog.close();
                                        resolve(null);
                                    }
                                    return;
                                }
                                const message = JSON.parse(arg.message);

                                if (message.type === 'ready') {
                                    // Dialog is ready, send the data
                                    dialog.messageChild(
                                        JSON.stringify({
                                            type: 'dictionary-merger',
                                            dictionary,
                                            extractions,
                                            autoGroupRareEntities,
                                        }),
                                    );
                                } else if (
                                    message.type ===
                                    'dictionary-merger-complete'
                                ) {
                                    if (!isResolved) {
                                        isResolved = true;
                                        dialog.close();
                                        resolve(message.result);
                                    }
                                }
                            } catch (e) {
                                console.error(
                                    'Failed to parse dialog message:',
                                    e,
                                );
                                if (!isResolved) {
                                    isResolved = true;
                                    dialog.close();
                                    resolve(null);
                                }
                            }
                        },
                    );

                    // Handle dialog close events
                    dialog.addEventHandler(
                        Office.EventType.DialogEventReceived,
                        (arg: any) => {
                            if (arg.error === 12006) {
                                // User closed dialog
                                console.log(
                                    'Dictionary merger dialog closed by user',
                                );
                                if (!isResolved) {
                                    isResolved = true;
                                    resolve(null);
                                }
                            } else if (arg.error === 12002) {
                                // Dialog navigation error
                                console.error(
                                    'Dictionary merger dialog navigation error',
                                );
                                if (!isResolved) {
                                    isResolved = true;
                                    resolve(null);
                                }
                            } else if (arg.error) {
                                console.error(
                                    'Dictionary merger dialog error:',
                                    arg.error,
                                );
                                if (!isResolved) {
                                    isResolved = true;
                                    resolve(null);
                                }
                            }
                        },
                    );

                    // Add timeout for dialog operations
                    const dialogTimeout = setTimeout(() => {
                        if (!isResolved) {
                            console.warn(
                                'Dictionary merger dialog timeout - closing dialog',
                            );
                            isResolved = true;
                            try {
                                dialog.close();
                            } catch (e) {
                                console.warn(
                                    'Failed to close timed-out dialog:',
                                    e,
                                );
                            }
                            resolve(null);
                        }
                    }, 300000); // 5 minute timeout

                    // Clear timeout when dialog resolves
                    const originalResolve = resolve;
                    resolve = (value) => {
                        clearTimeout(dialogTimeout);
                        originalResolve(value);
                    };
                },
            );
        } catch (error) {
            console.error('Error opening merger dialog:', error);
            resolve(null); // Graceful fallback
        }
    });
}

/**
 * Show a user notification message
 * @param message The message to show
 * @param type The type of notification
 */
async function showUserNotification(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
) {
    try {
        // Enhanced logging with timestamp and better formatting
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;

        switch (type) {
            case 'success':
                console.log(`✅ ${formattedMessage}`);
                break;
            case 'error':
                console.error(`❌ ${formattedMessage}`);
                break;
            case 'info':
            default:
                console.info(`ℹ️ ${formattedMessage}`);
                break;
        }

        // Future enhancement: Could integrate with Office notification APIs
        // or show a temporary message in the task pane
        // For now, we provide comprehensive console feedback for debugging
    } catch (error) {
        console.warn('Failed to show user notification:', error);
    }
}

/**
 * Write extraction results to the Excel sheet with enhanced error handling
 * @param result The extraction result to write (original or merged)
 * @param context Sheet writing context
 */
async function writeResultsToSheet(
    result: { dictionary: string[]; results: string[][][] | string[][] },
    context: {
        sheet: Excel.Worksheet;
        used: Excel.Range;
        hasHeader: boolean;
        inputRowMap: number[];
        inputs: string[];
    },
) {
    const { sheet, used, hasHeader, inputRowMap, inputs } = context;

    // Validate the result data before writing
    if (
        !result ||
        !Array.isArray(result.dictionary) ||
        !Array.isArray(result.results)
    ) {
        throw new Error('Invalid result data structure');
    }

    // Direct-to-sheet writeback
    const resultDict = result.dictionary || [];
    const resultLen = resultDict.length;
    const headerRow = used.rowIndex;
    const dictStartCol = 1; // Column B

    try {
        if (hasHeader && resultLen > 0) {
            // Overwrite header starting at column B with the final dictionary
            const headerRange = sheet.getRangeByIndexes(
                headerRow,
                dictStartCol,
                1,
                Math.max(resultLen, 1),
            );
            headerRange.values = [resultLen > 0 ? resultDict : ['']];
        }
    } catch (error) {
        console.error('Error writing headers to sheet:', error);
        throw new Error(
            `Failed to write headers: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    try {
        // Build per-column arrays and write by matching actual header positions (if any)
        const toCellString = (arr: string[] | string | undefined) => {
            if (Array.isArray(arr)) {
                return arr.join('; ');
            }
            return String(arr || '');
        };
        const dataRowCount = hasHeader ? used.rowCount - 1 : used.rowCount;
        const firstDataRow = hasHeader ? used.rowIndex + 1 : used.rowIndex;

        // Columns are written in order starting at column B; no remapping to existing headers
        const writeRows = Math.min(inputs.length, result.results.length);

        for (let j = 0; j < resultLen; j++) {
            try {
                const colAbs = dictStartCol + j;

                const colValues: string[][] = Array.from(
                    { length: dataRowCount },
                    () => [''],
                );

                for (let i = 0; i < writeRows; i++) {
                    const usedRelRow = inputRowMap[i];
                    const gridRow = usedRelRow - (hasHeader ? 1 : 0);
                    const rowRes = result.results[i] ?? [];
                    const matches = rowRes[j];
                    colValues[gridRow][0] = toCellString(matches);
                }

                const colRange = sheet.getRangeByIndexes(
                    firstDataRow,
                    colAbs,
                    Math.max(dataRowCount, 0),
                    1,
                );
                colRange.values = colValues.length > 0 ? colValues : [['']];
            } catch (columnError) {
                console.error(`Error writing column ${j}:`, columnError);
                // Continue with other columns even if one fails
            }
        }
    } catch (error) {
        console.error('Error writing data to sheet:', error);
        throw new Error(
            `Failed to write extraction data: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export async function extractElementsFromWorksheet(options: {
    sheetName: string | null;
    hasHeader: boolean;
    dictionary: string[];
    expandDictionary: boolean;
    autoGroupRareEntities?: boolean;
}) {
    await Excel.run(async (context) => {
        const sheet = options.sheetName
            ? context.workbook.worksheets.getItem(options.sheetName)
            : context.workbook.worksheets.getActiveWorksheet();
        const used = sheet.getUsedRange();
        used.load([
            'values',
            'rowCount',
            'columnCount',
            'rowIndex',
            'columnIndex',
            'address',
        ]);
        await context.sync();

        const values: any[][] = used.values as any[][];
        const rowCount = used.rowCount;
        const colCount = used.columnCount;
        if (!values || rowCount < 1 || colCount < 1) {
            throw new Error('Worksheet appears to be empty.');
        }

        // Always start dictionary columns at absolute column B (index 1)
        const hasHeader = !!options.hasHeader;

        // Inputs: column A, from row 2 if header, else row 1
        const startRow = hasHeader ? 1 : 0;
        const inputs: string[] = [];
        const inputRowMap: number[] = [];
        for (let r = startRow; r < rowCount; r++) {
            const cell = values[r][0];
            const text = (cell == null ? '' : String(cell)).trim();
            if (text) {
                inputs.push(text);
                inputRowMap.push(r); // sheet row index in zero-based usedRange values
            }
        }
        if (inputs.length === 0) {
            throw new Error('No input texts found in column A.');
        }

        const dictionary = Array.from(
            new Set(
                (options.dictionary || [])
                    .map((s) => String(s).trim())
                    .filter(Boolean),
            ),
        );

        const result = await extractElementsApi(inputs, {
            // Category now deprecated; pass a generic placeholder to maintain compatibility
            category: 'entity',
            dictionary,
            expandDictionary: options.expandDictionary,
            fast: false,
            onProgress: (m) => console.log(m),
        });

        let finalResult = result;

        // Check if merger dialog should be shown
        if (
            options.expandDictionary &&
            result.dictionary &&
            result.dictionary.length > 1
        ) {
            console.log('Dictionary merger: Checking for suggestions...', {
                expandDictionary: options.expandDictionary,
                dictionaryLength: result.dictionary.length,
                dictionary: result.dictionary,
            });

            try {
                // Convert 3D results to 2D for merger compatibility
                const results2D: string[][] = result.results.map((row) =>
                    row.map((cell) =>
                        Array.isArray(cell) ? cell.join('; ') : String(cell),
                    ),
                );

                // Generate merger suggestions using DictionaryMerger
                const merger = new DictionaryMerger();

                // Check for rare entities if auto-grouping is enabled
                let suggestions: any[] = [];
                if (options.autoGroupRareEntities) {
                    const rareEntities = merger.identifyRareEntitiesFrom3D(
                        result.dictionary,
                        result.results,
                        0.005, // 0.5%
                    );
                    const rareGrouping =
                        merger.createRareEntitiesGroupingFrom3D(
                            rareEntities,
                            result.dictionary,
                            result.results,
                        );
                    if (rareGrouping) {
                        suggestions.push(rareGrouping);
                    }
                }

                // Generate regular similarity suggestions
                const regularSuggestions = await merger.generateSuggestions(
                    result.dictionary,
                    results2D,
                    {
                        threshold: 0.6,
                        maxSuggestions: 10,
                        timeout: 5000,
                        autoGroupRareEntities: false, // Don't double-add rare entities
                    },
                );

                suggestions.push(...regularSuggestions);

                console.log('Dictionary merger: Generated suggestions', {
                    suggestionsCount: suggestions.length,
                    suggestions: suggestions,
                });

                // Only show dialog if there are suggestions
                if (suggestions.length > 0) {
                    console.log('Dictionary merger: Opening dialog...', {
                        dictionary: result.dictionary,
                        resultsLength: result.results?.length,
                        resultsType: typeof result.results,
                        results: result.results,
                    });

                    // Validate data before passing to dialog
                    if (
                        !result.dictionary ||
                        !Array.isArray(result.dictionary)
                    ) {
                        throw new Error(
                            'Invalid dictionary data for merger dialog',
                        );
                    }
                    if (!result.results || !Array.isArray(result.results)) {
                        throw new Error(
                            'Invalid results data for merger dialog',
                        );
                    }

                    const mergerResult = await showMergerDialog(
                        result.dictionary,
                        results2D,
                        options.autoGroupRareEntities || false,
                    );

                    console.log(
                        'Dictionary merger: Dialog result',
                        mergerResult,
                    );

                    if (mergerResult) {
                        // Convert merged 2D results back to 3D format for consistency
                        const results3D: string[][][] =
                            mergerResult.mergedExtractions.map(
                                (row) => row.map((cell) => [cell]), // Wrap each cell value in an array
                            );

                        // Use merged data
                        finalResult = {
                            ...result,
                            dictionary: mergerResult.mergedDictionary,
                            results: results3D,
                        };
                    }
                    // If mergerResult is null (user cancelled), use original data
                } else {
                    console.log(
                        'Dictionary merger: No suggestions found, skipping dialog',
                    );
                }
            } catch (error) {
                console.error('Error in merger process:', error);
                await showUserNotification(
                    'Merger process encountered an error. Using original extraction data.',
                    'error',
                );
                // Continue with original data on error - finalResult remains as result
            }
        } else {
            console.log('Dictionary merger: Conditions not met', {
                expandDictionary: options.expandDictionary,
                hasDictionary: !!result.dictionary,
                dictionaryLength: result.dictionary?.length || 0,
            });
        }

        // Write the final result (either merged or original) to sheet
        try {
            await writeResultsToSheet(finalResult, {
                sheet,
                used,
                hasHeader,
                inputRowMap,
                inputs,
            });
        } catch (writeError) {
            console.error('Error writing results to sheet:', writeError);

            // If writing merged results failed, try with original data as fallback
            if (finalResult !== result) {
                console.log('Attempting fallback to original data...');
                await showUserNotification(
                    'Error writing merged data. Falling back to original extraction results.',
                    'error',
                );

                try {
                    await writeResultsToSheet(result, {
                        sheet,
                        used,
                        hasHeader,
                        inputRowMap,
                        inputs,
                    });
                    await showUserNotification(
                        'Fallback successful. Original extraction data has been written to the sheet.',
                        'info',
                    );
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    await showUserNotification(
                        'Critical error: Failed to write any data to sheet.',
                        'error',
                    );
                    throw fallbackError;
                }
            } else {
                // Original data write failed
                await showUserNotification(
                    'Error writing extraction data to sheet.',
                    'error',
                );
                throw writeError;
            }
        }

        // Provide comprehensive confirmation messaging
        if (finalResult !== result) {
            // Mergers were applied - get detailed merger information
            const appliedMergers = (finalResult as any).appliedMergers;
            const mergerCount = Array.isArray(appliedMergers)
                ? appliedMergers.length
                : 0;
            const totalItemsMerged = Array.isArray(appliedMergers)
                ? appliedMergers.reduce(
                      (sum: number, merger: any) =>
                          sum + (merger.items?.length || 0),
                      0,
                  )
                : 0;

            await showUserNotification(
                `Dictionary merger completed successfully! Applied ${mergerCount} merger${mergerCount !== 1 ? 's' : ''}, consolidating ${totalItemsMerged} items into ${mergerCount} unified entries.`,
                'success',
            );

            // Log detailed merger information for debugging
            if (Array.isArray(appliedMergers)) {
                appliedMergers.forEach((merger: any, index: number) => {
                    console.log(
                        `Merger ${index + 1}: "${merger.finalName}" (${merger.type}) - merged ${merger.items?.length || 0} items`,
                    );
                });
            }
        } else if (
            options.expandDictionary &&
            result.dictionary &&
            result.dictionary.length > 1
        ) {
            // Dictionary expansion was enabled but no mergers were applied
            await showUserNotification(
                `Extraction completed with ${result.dictionary.length} unique dictionary items. No similar items found for automatic merging.`,
                'info',
            );
        } else {
            // Standard extraction completion
            await showUserNotification(
                `Extraction completed successfully with ${result.dictionary?.length || 0} dictionary items.`,
                'success',
            );
        }
    });
}
