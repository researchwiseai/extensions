import { allocateThemes } from 'pulse-common/api';
import {
    extractInputsWithHeader,
    expandWithBlankRows,
} from 'pulse-common/dataUtils';
import { feedToast } from './feedToast';
import { maybeActivateSheet } from './maybeActivateSheet';
import { readThemesFromSheet } from './readThemesFromSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function allocateThemesFromSheet(
    dataRange: string,
    sheetName: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();

    let dataRangeObj: GoogleAppsScript.Spreadsheet.Range;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert('Error reading data range: ' + e.toString());
        return;
    }
    const values = dataRangeObj.getValues();

    const { header, inputs, positions } = extractInputsWithHeader(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
        hasHeader,
    });

    let themes;
    try {
        themes = readThemesFromSheet(sheetName);
    } catch (err) {
        ui.alert((err as Error).message);
        return;
    }

    const allocations = await allocateThemes(inputs, themes, {
        fast: false,
        onProgress: (message: string) => {
            feedToast(message);
        },
    });

    // Write themes to a new sheet (Text and Theme columns)
    const output = ss.insertSheet(`Allocation_${Date.now()}`);
    const title = hasHeader && header ? header : 'Text';
    output.getRange(1, 1, 1, 2).setValues([[title, 'Theme']]);
    const inputsExpanded = expandWithBlankRows(inputs, positions);
    const labels = allocations.map((a) => (a.belowThreshold ? '' : a.theme.label));
    const labelsExpanded = expandWithBlankRows(labels, positions);
    if (inputsExpanded.length > 0) {
        output
            .getRange(2, 1, inputsExpanded.length, 1)
            .setValues(inputsExpanded.map((v) => [v]));
    }
    if (labelsExpanded.length > 0) {
        output
            .getRange(2, 2, labelsExpanded.length, 1)
            .setValues(labelsExpanded.map((l) => [l]));
    }

    feedToast('Theme allocation complete');
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
