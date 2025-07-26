import { splitSimilarityMatrix, ShortTheme } from 'pulse-common/themes';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { generateThemesFlow } from './generateThemes';
import { maybeActivateSheet } from './maybeActivateSheet';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function similarityMatrixThemesAutomatic(
    dataRange: string,
    hasHeader = false,
) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();
    const { inputs, positions, themes } = await generateThemesFlow(
        dataRange,
        hasHeader,
    );
    feedToast('Theme generation complete. Building matrix...');
    const expanded = expandWithBlankRows(inputs, positions);
    const matrix = await splitSimilarityMatrix(
        expanded,
        themes as ShortTheme[],
        {
            fast: false,
            normalize: false,
            onProgress: (m) => feedToast(m),
        },
    );
    const sheet = writeMatrix(matrix, expanded, themes);
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
): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet(`Similarity_${Date.now()}`);
    const header = ['Text', ...themes.map((t) => t.label)];
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    const rows = matrix.map((row, i) => [inputs[i], ...row]);
    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    return sheet;
}
