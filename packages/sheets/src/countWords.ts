import { extractInputs } from 'pulse-common/input';
import { maybeActivateSheet } from './maybeActivateSheet';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';

export function countWordsFlow(dataRange: string) {
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
    const counts = inputs.map(
        (t) => String(t).trim().split(/\s+/).filter(Boolean).length,
    );

    const output = ss.insertSheet(`WordCount_${Date.now()}`);
    output.getRange(1, 1, 1, 2).setValues([['Text', 'Word Count']]);
    output
        .getRange(2, 1, values.length, 1)
        .setValues(values.map((r) => [r[0]]));

    positions.forEach((pos, idx) => {
        const rowIdx = pos.row - rangeObj.getRow() + 2;
        output.getRange(rowIdx, 2).setValue(counts[idx]);
    });

    feedToast('Word count complete');
    maybeActivateSheet(output, startTime);

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                SpreadsheetApp.setActiveSheet(output);
            },
            sheetName: output.getName(),
        });
    }
}
