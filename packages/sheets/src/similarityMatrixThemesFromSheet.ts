import { splitSimilarityMatrix, ShortTheme } from 'pulse-common/themes';
import { extractInputsWithHeader, expandWithBlankRows } from 'pulse-common/dataUtils';
import { maybeActivateSheet } from './maybeActivateSheet';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';
import { readThemesFromSheet } from './readThemesFromSheet';

export async function similarityMatrixThemesFromSheet(
    dataRange: string,
    sheetName: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();

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

    let themes: ShortTheme[];
    try {
        themes = readThemesFromSheet(sheetName) as ShortTheme[];
    } catch (err) {
        ui.alert((err as Error).message);
        return;
    }

    const expanded = expandWithBlankRows(inputs, positions);
    const matrix = await splitSimilarityMatrix(expanded, themes, {
        fast: false,
        normalize: false,
        onProgress: (m) => feedToast(m),
    });

    const sheet = writeMatrix(matrix, expanded, themes, header);
    maybeActivateSheet(sheet, startTime);

    feedToast('Similarity matrix complete');

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                SpreadsheetApp.setActiveSheet(sheet);
            },
            sheetName: sheet.getName(),
        });
    }
}

function writeMatrix(
    matrix: number[][],
    inputs: string[],
    themes: ShortTheme[],
    header?: string,
): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet(`Similarity_${Date.now()}`);
    const headerRow = [header ?? 'Text', ...themes.map((t) => t.label)];
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    const rows = matrix.map((row, i) => [inputs[i], ...row]);
    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    return sheet;
}
