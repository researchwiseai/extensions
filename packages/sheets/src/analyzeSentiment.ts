import { analyzeSentiment, extractInputs } from 'pulse-common';

/**
 * Analyze sentiment of selected text in the active sheet.
 *
 * Called by FE
 *
 * @param {string} dataRange A1 notation of the data range to analyze.
 */
export async function analyzeSentimentFlow() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Starting sentiment analysis...', 'Pulse');

    const dataRangeObj = ss.getActiveRange();

    const dataSheet = dataRangeObj.getSheet();
    const values = dataRangeObj.getValues();

    const { inputs, positions } = extractInputs(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
    });
    // Determine sheet and values for data range

    if (inputs.length === 0) {
        ui.alert('No text found in selected data range for theme allocation.');
        return;
    }

    const data = await analyzeSentiment(inputs, {
        fast: false,
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
