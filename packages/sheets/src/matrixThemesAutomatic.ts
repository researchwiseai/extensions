import { multiCode, ShortTheme } from 'pulse-common/themes';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { generateThemesFlow } from './generateThemes';
import { maybeActivateSheet } from './maybeActivateSheet';

const THRESHOLD = 0.4;

export async function matrixThemesAutomatic(
    dataRange: string,
    hasHeader = false,
) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();
    const { inputs, positions, themes } = await generateThemesFlow(dataRange, hasHeader);
    ss.toast('Theme generation complete. Building matrix...', 'Pulse');
    const expanded = expandWithBlankRows(inputs, positions);
    const matrix = await multiCode(expanded, themes as ShortTheme[], {
        fast: false,
        threshold: THRESHOLD,
        onProgress: (m) => ss.toast(m, 'Pulse'),
    });
    const sheet = writeMatrix(matrix, expanded, themes);
    maybeActivateSheet(sheet, startTime);
}

function writeMatrix(
    matrix: (number | boolean)[][],
    inputs: string[],
    themes: ShortTheme[],
): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet(`Allocation_${Date.now()}`);
    const header = ['Text', ...themes.map((t) => t.label)];
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    const rows = matrix.map((row, i) => [inputs[i], ...row]);
    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    return sheet;
}
