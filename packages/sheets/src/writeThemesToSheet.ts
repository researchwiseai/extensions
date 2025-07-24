import type { Theme } from 'pulse-common';
import { themesToRows } from 'pulse-common/dataUtils';

export function writeThemesToSheet(themes: Theme[]) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Themes');
    if (!sheet) {
        sheet = ss.insertSheet('Themes');
    } else {
        sheet.clear();
    }

    const headers = [
        'Label',
        'Short Label',
        'Description',
        'Representative 1',
        'Representative 2',
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const rows = themesToRows(themes);
    const target = sheet.getRange(2, 1, rows.length, headers.length);
    if (rows.length > 0) {
        target.setValues(rows);
    } else {
        target.clear();
    }
}
