import { allocateThemes, extractInputs, getThemeSets } from 'pulse-common';
import { writeAllocationsToSheet } from './writeAllocationsToSheet';

/**
 * Allocate themes from an existing saved set.
 * @param {string} dataRange A1 notation of the data range.
 * @param {string} name Name of the saved theme set.
 */
export async function allocateThemesFromSet(dataRange: string, name: string) {
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

    const { inputs, positions } = extractInputs(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
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
    writeAllocationsToSheet(
        await allocateThemes(inputs, themes, {
            fast: false,
            onProgress: (message: string) => {
                ss.toast(message, 'Pulse');
            }
        }),
        dataSheet,
        positions,
    );
}
