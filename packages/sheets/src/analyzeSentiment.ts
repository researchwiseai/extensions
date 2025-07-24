import { analyzeSentiment } from 'pulse-common/api';
import { extractInputsWithHeader, expandWithBlankRows } from 'pulse-common/dataUtils';

/**
 * Analyze sentiment of selected text in the active sheet.
 *
 * Called by FE
 *
 * @param {string} dataRange A1 notation of the data range to analyze.
 */
/**
 * Analyze sentiment of specified text range in the active sheet.
 *
 * @param dataRange A1 notation of the data range to analyze, including sheet name (e.g., 'Sheet1!A1:B10').
 */
export async function analyzeSentimentFlow(
    dataRange: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Notify user
    ss.toast('Starting sentiment analysis...', 'Pulse');

    // Parse the passed range (sheet!A1Notation)
    const parts = dataRange.split('!');
    const sheetName = parts[0];
    const rangeNotation = parts.slice(1).join('!');
    const dataSheet = ss.getSheetByName(sheetName);
    if (!dataSheet) {
        ui.alert(`Sheet "${sheetName}" not found.`);
        return;
    }
    let dataRangeObj;
    try {
        dataRangeObj = dataSheet.getRange(rangeNotation);
    } catch (e) {
        ui.alert(`Invalid range notation "${rangeNotation}".`);
        return;
    }
    const values = dataRangeObj.getValues();

    const { inputs, positions } = extractInputsWithHeader(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
        hasHeader,
    });
    // Determine sheet and values for data range

    if (inputs.length === 0) {
        ui.alert('No text found in selected data range for sentiment analysis.');
        return;
    }

    const useFast = inputs.length < 200;
    const data = await analyzeSentiment(inputs, {
        fast: useFast,
        onProgress: (message) => {
            ss.toast(message, 'Pulse');
        },
    })

    const sentiments = data.results.map((r) => r.sentiment);
    const expanded = expandWithBlankRows(sentiments, positions);
    const startRow = Math.min(...positions.map((p) => p.row));
    const col = dataRangeObj.getColumn() + 1;
    dataSheet
        .getRange(startRow, col, expanded.length, 1)
        .setValues(expanded.map((s) => [s]));

    ss.toast('Sentiment analysis complete', 'Pulse');

}
