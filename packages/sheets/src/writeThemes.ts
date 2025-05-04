import { Theme } from "pulse-common";

export function writeThemes(themes: Theme[]) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Log full themes info to 'Themes' worksheet
    let outputSheet = ss.getSheetByName('Themes');
    if (!outputSheet) {
        outputSheet = ss.insertSheet('Themes');
    } else {
        outputSheet.clear();
    }
    const headers = [
        'Short Label',
        'Label',
        'Description',
        'Representative 1',
        'Representative 2',
    ];
    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const rows = themes.map((theme) => [
        theme.shortLabel,
        theme.label,
        theme.description,
        theme.representatives[0] || '',
        theme.representatives[1] || '',
    ]);
    if (rows.length > 0) {
        outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
}