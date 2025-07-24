import { multiCode, getThemeSets, ShortTheme } from 'pulse-common/themes';
import { extractInputsWithHeader, expandWithBlankRows } from 'pulse-common/dataUtils';

const THRESHOLD = 0.4;

export async function matrixThemesFromSet(
    dataRange: string,
    name: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let rangeObj: GoogleAppsScript.Spreadsheet.Range;
    try {
        rangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert('Error reading data range: ' + e.toString());
        return;
    }
    const values = rangeObj.getValues();
    const { header, inputs, positions } = extractInputsWithHeader(values, {
        rowOffset: rangeObj.getRow(),
        colOffset: rangeObj.getColumn(),
        hasHeader,
    });

    const sets = await getThemeSets();
    const set = sets.find((s) => s.name === name);
    if (!set) {
        ui.alert('Theme set not found: ' + name);
        return;
    }

    const expanded = expandWithBlankRows(inputs, positions);
    const matrix = await multiCode(expanded, set.themes as ShortTheme[], {
        fast: false,
        threshold: THRESHOLD,
        onProgress: (m) => ss.toast(m, 'Pulse'),
    });

    writeMatrix(matrix, expanded, set.themes, header);
}

function writeMatrix(
    matrix: (number|boolean)[][],
    inputs: string[],
    themes: ShortTheme[],
    header?: string,
) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet(`Allocation_${Date.now()}`);
    const headerRow = [header ?? 'Text', ...themes.map((t) => t.label)];
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    const rows = matrix.map((row, i) => [inputs[i], ...row]);
    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
}
