import { Theme } from 'pulse-common';
import { themesToRows } from 'pulse-common/dataUtils';
import { maybeActivateSheet } from './maybeActivateSheet';

export function writeThemes(
    themes: Theme[],
    startTime?: number,
): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Log full themes info to 'Themes' worksheet
    let outputSheet = ss.getSheetByName('Themes');
    if (!outputSheet) {
        outputSheet = ss.insertSheet('Themes');
    } else {
        outputSheet.clear();
    }
    const repCount = Math.min(
        10,
        Math.max(0, ...themes.map((t) => (t.representatives?.length ?? 0))),
    );
    const repHeaders = Array.from(
        { length: repCount },
        (_, i) => `Representative ${i + 1}`,
    );
    const headers = ['Label', 'Short Label', 'Description', ...repHeaders];
    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const rows = themesToRows(themes, repCount);
    if (rows.length > 0) {
        outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    if (typeof startTime === 'number') {
        maybeActivateSheet(outputSheet, startTime);
    }
    return outputSheet;
}
