import { allocateThemes } from 'pulse-common';
import { writeAllocationsToSheet } from './writeAllocationsToSheet';
import { generateThemesFlow } from './generateThemes';

/**
 * Automatically generates themes and allocates themes to data.
 *
 * Called by FE
 *
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export async function allocateThemesAutomatic(dataRange: string) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const {
        inputs: usedInputs,
        positions,
        dataRangeObj,
        themes,
    } = await generateThemesFlow(dataRange);


    ss.toast('Theme generation complete. Starting allocation work', 'Pulse');

    const dataSheet = dataRangeObj.getSheet();
    // Allocate themes to data
    writeAllocationsToSheet(
        await allocateThemes(usedInputs, themes, {
            fast: false,
            onProgress: (message: string) => {
                ss.toast(message, 'Pulse');
            }
        }),
        dataSheet,
        positions,
    );

}
