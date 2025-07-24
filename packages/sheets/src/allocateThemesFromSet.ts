import { allocateThemes } from 'pulse-common/api';
import { extractInputsWithHeader, expandWithBlankRows } from 'pulse-common/dataUtils';
import { getThemeSets } from 'pulse-common/themes';

/**
 * Allocate themes from an existing saved set.
 * @param {string} dataRange A1 notation of the data range.
 * @param {string} name Name of the saved theme set.
 */
export async function allocateThemesFromSet(
    dataRange: string,
    name: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let dataRangeObj: GoogleAppsScript.Spreadsheet.Range;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert('Error reading data range: ' + e.toString());
        return;
    }
    const values = dataRangeObj.getValues();

    const { inputs, positions } = extractInputsWithHeader(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
        hasHeader,
    });

    const themeSet = await getThemeSets();
    const setObj = themeSet.find(function (s) {
        return s.name === name;
    });
    if (!setObj) {
        ui.alert('Theme set not found: ' + name);
        return;
    }
    const themes = setObj.themes;

    const dataSheet = dataRangeObj.getSheet();

    const allocations = await allocateThemes(inputs, themes, {
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
