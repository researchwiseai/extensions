import { analyzeSentiment, extractInputs } from 'pulse-common';

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
export async function analyzeSentimentFlow(dataRange: string) {
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

    const { inputs, positions } = extractInputs(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
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

    function writeResults(results) {
        results.forEach((res, idx) => {
            const pos = positions[idx];
            const sentiment = res.sentiment;
            dataSheet.getRange(pos.row, pos.col + 1).setValue(sentiment);
        });
    }

    writeResults(data.results);
    ss.toast('Sentiment analysis complete', 'Pulse');

}
