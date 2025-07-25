import { analyzeSentiment } from 'pulse-common/api';
import { extractInputsWithHeader } from 'pulse-common/dataUtils';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';
import { maybeActivateSheet } from './maybeActivateSheet';

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
    feedToast('Starting sentiment analysis...');

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
    const startTime = Date.now();
    const values = dataRangeObj.getValues();

    Logger.log(
        `Analyzing sentiment for range: ${dataRangeObj.getA1Notation()} in sheet: ${sheetName}`,
    );

    const { header, inputs, positions } = extractInputsWithHeader(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
        hasHeader,
    });
    // Determine sheet and values for data range

    Logger.log(
        `Extracted inputs: ${inputs.length}, positions: ${positions.length}`,
    );

    if (inputs.length === 0) {
        ui.alert(
            'No text found in selected data range for sentiment analysis.',
        );
        return;
    }

    const useFast = inputs.length < 200;

    Logger.log(`Using ${useFast ? 'fast' : 'full'} sentiment analysis mode`);

    if (!useFast) {
        Logger.log(`Opening sidebar for full sentiment analysis...`);

        const html =
            HtmlService.createHtmlOutputFromFile('Feed').setTitle('Pulse');
        SpreadsheetApp.getUi().showSidebar(html);
    }

    Logger.log(`Starting sentiment analysis for ${inputs.length} inputs...`);

    const data = await analyzeSentiment(inputs, {
        fast: useFast,
        onProgress: (message) => {
            feedToast(message);
        },
    });

    Logger.log(`Sentiment analysis completed: ${data.results.length} results`);

    const sentiments = data.results.map((r) => r.sentiment);

    const outputSheet = ss.insertSheet(`Sentiment_${Date.now()}`);

    const headerLabel = hasHeader && header ? header : 'Text';
    outputSheet.getRange(1, 1, 1, 2).setValues([[headerLabel, 'Sentiment']]);

    const valuesToWrite = (hasHeader ? values.slice(1) : values).map((r) => [
        r[0],
    ]);
    if (valuesToWrite.length > 0) {
        outputSheet
            .getRange(2, 1, valuesToWrite.length, 1)
            .setValues(valuesToWrite);
    }

    positions.forEach((pos, idx) => {
        const rowIdx = pos.row - dataRangeObj.getRow() - (hasHeader ? 1 : 0);
        outputSheet.getRange(rowIdx + 2, 2).setValue(sentiments[idx]);
    });

    maybeActivateSheet(outputSheet, startTime);

    feedToast('Sentiment analysis complete');

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                SpreadsheetApp.setActiveSheet(outputSheet);
            },
            sheetName: outputSheet.getName(),
        });
    }
}
