import { extractInputs } from 'pulse-common/input';
import { maybeActivateSheet } from './maybeActivateSheet';

export function splitIntoTokensFlow(dataRange: string) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();

    const parts = dataRange.split('!');
    const sheetName = parts[0];
    const rangeNotation = parts.slice(1).join('!');
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        ui.alert(`Sheet "${sheetName}" not found.`);
        return;
    }
    let rangeObj: GoogleAppsScript.Spreadsheet.Range;
    try {
        rangeObj = sheet.getRange(rangeNotation);
    } catch (e) {
        ui.alert(`Invalid range notation "${rangeNotation}".`);
        return;
    }
    if (rangeObj.getNumColumns() > 1) {
        ui.alert('Please select a single column range');
        return;
    }
    const values = rangeObj.getValues();
    const { inputs, positions } = extractInputs(values, {
        rowOffset: rangeObj.getRow(),
        colOffset: rangeObj.getColumn(),
    });
    if (inputs.length === 0) {
        ui.alert('No text found in selected data range.');
        return;
    }
    // @ts-ignore
    const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
    const tokens: string[][] = inputs.map((input) =>
        Array.from(segmenter.segment(input ?? ''))
            .map((s) => s.segment.trim())
            .filter(Boolean),
    );
    const max = Math.max(...tokens.map((t) => t.length));

    const output = ss.insertSheet(`Tokens_${Date.now()}`);
    const header = ['Text'];
    for (let i = 0; i < max; i++) {
        header.push(`Token ${i + 1}`);
    }
    output.getRange(1, 1, 1, header.length).setValues([header]);
    output.getRange(2, 1, values.length, 1).setValues(values.map((r) => [r[0]]));

    positions.forEach((pos, idx) => {
        const rowIdx = pos.row - rangeObj.getRow() + 2;
        tokens[idx].forEach((token, j) => {
            output.getRange(rowIdx, j + 2).setValue(token);
        });
    });

    ss.toast('Token split complete', 'Pulse');
    maybeActivateSheet(output, startTime);
}
