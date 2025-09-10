/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office, Excel */
import { promptRange } from '../services/promptRange';
import { analyzeSentiment as analyzeSentimentLogic } from '../analyzeSentiment';
import { extractElementsFromWorksheet } from '../extractElements';
import { promptExtractionSetup } from '../services/promptExtractionSetup';
import { promptDictionaryEditor } from '../services/promptDictionaryEditor';

/**
 * Handler for Analyze Sentiment ribbon button.
 * @param event - The event object from the button click.
 */
async function analyzeSentiment(event: Office.AddinCommands.Event) {
    try {
        await Excel.run(async (context) => {
            // Get selected range and confirm with user
            const selected = context.workbook.getSelectedRange();
            selected.load('address');
            await context.sync();
            const defaultRange = selected.address;
            // Prompt user to confirm or change range
            let confirmedRange: string | null;
            let hasHeader = false;
            try {
                ({ range: confirmedRange, hasHeader } =
                    await promptRange(defaultRange));
            } catch (err) {
                console.error('Range selection dialog error:', err);
                return;
            }
            if (!confirmedRange) {
                // User cancelled
                return;
            }
            // Perform sentiment analysis
            await analyzeSentimentLogic(context, confirmedRange, hasHeader);
        });
    } catch (err) {
        console.error('Analyze Sentiment error:', err);
    } finally {
        event.completed();
    }
}

// Register the Analyze Sentiment command handler
Office.actions.associate('analyzeSentiment', analyzeSentiment);

/**
 * Handler for Extractions ribbon button.
 */
async function runExtractions(event: Office.AddinCommands.Event) {
    try {
        await Excel.run(async (context) => {
            const worksheets = context.workbook.worksheets;
            worksheets.load('items/name');
            const activeSheet = worksheets.getActiveWorksheet();
            activeSheet.load('name');
            await context.sync();
            const sheetNames = worksheets.items.map((ws) => ws.name);
            const setup = await promptExtractionSetup(sheetNames, activeSheet.name);
            if (!setup) return;
            const used = (setup.sheetName
                ? context.workbook.worksheets.getItem(setup.sheetName)
                : context.workbook.worksheets.getActiveWorksheet()
            ).getUsedRange();
            used.load(['values', 'rowCount', 'columnCount']);
            await context.sync();
            const values: any[][] = used.values as any[][];
            const rowCount = used.rowCount;
            const colCount = used.columnCount;
            let count = 0;
            for (let r = 0; r < rowCount; r++) {
                const v = values[r]?.[0];
                const t = (v == null ? '' : String(v)).trim();
                if (t) count += 1;
            }
            if (setup.hasHeader && count > 0) count -= 1;
            const init: string[] = [];
            if (setup.hasHeader && colCount >= 2 && rowCount >= 1) {
                const header = values[0] || [];
                for (let c = 1; c < colCount; c++) {
                    const term = String(header[c] ?? '').trim();
                    if (term) init.push(term);
                }
            }
            const edited = await promptDictionaryEditor(
                init,
                count,
                true,
                async (draft) => {
                    return await Excel.run(async (context) => {
                        const sheet = setup.sheetName
                            ? context.workbook.worksheets.getItem(setup.sheetName)
                            : context.workbook.worksheets.getActiveWorksheet();
                        const used = sheet.getUsedRange();
                        used.load(['values', 'rowCount', 'columnCount']);
                        await context.sync();
                        const values: any[][] = used.values as any[][];
                        const rowCount = used.rowCount;
                        const colCount = used.columnCount;
                        const startRow = setup.hasHeader ? 1 : 0;
                        let anyExisting = false;
                        for (let r = startRow; r < rowCount; r++) {
                            const a = (values[r]?.[0] ?? '').toString().trim();
                            if (!a) continue;
                            for (let c = 1; c < colCount; c++) {
                                const v = values[r]?.[c];
                                const t = (v == null ? '' : String(v)).trim();
                                if (t) { anyExisting = true; break; }
                            }
                            if (anyExisting) break;
                        }
                        return !anyExisting;
                    });
                },
            );
            if (!edited) return;
            await extractElementsFromWorksheet({
                sheetName: setup.sheetName,
                hasHeader: setup.hasHeader,
                dictionary: edited.dictionary,
                expandDictionary: !!edited.expand,
            });
        });
    } catch (err) {
        console.error('Extractions error:', err);
    } finally {
        event.completed();
    }
}

Office.actions.associate('runExtractions', runExtractions);
