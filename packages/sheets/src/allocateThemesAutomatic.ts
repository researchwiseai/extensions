import { allocateThemes } from 'pulse-common/api';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { generateThemesFlow } from './generateThemes';

/**
 * Automatically generates themes and allocates themes to data.
 *
 * Called by FE
 *
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export async function allocateThemesAutomatic(
    dataRange: string,
    hasHeader = false,
) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const {
        inputs: usedInputs,
        positions,
        dataRangeObj,
        themes,
    } = await generateThemesFlow(dataRange, hasHeader);


    ss.toast('Theme generation complete. Starting allocation work', 'Pulse');

    const dataSheet = dataRangeObj.getSheet();

    const allocations = await allocateThemes(usedInputs, themes, {
        fast: false,
        onProgress: (message: string) => {
            ss.toast(message, 'Pulse');
        },
    });

    const labels = allocations.map((a) =>
        a.belowThreshold ? '' : a.theme.label,
    );
    const expanded = expandWithBlankRows(labels, positions);
    const startRow = Math.min(...positions.map((p) => p.row));
    const col = dataRangeObj.getColumn() + 1;
    dataSheet
        .getRange(startRow, col, expanded.length, 1)
        .setValues(expanded.map((l) => [l]));

}
