import { allocateThemes, extractInputs } from 'pulse-common';
import { writeAllocationsToSheet } from './writeAllocationsToSheet';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';

/**
 * Processes custom themes after the user submits ranges via dialog.
 *
 * Called by FE
 *
 * @param {{dataRange: string, labels: string, rep1: string, rep2: string}} ranges
 */
export async function allocateAndSaveThemeSet(ranges: {
    dataRange: string;
    labels: string;
    rep1: string;
    rep2: string;
    rep3?: string;
    rep4?: string;
    rep5?: string;
    rep6?: string;
    rep7?: string;
    rep8?: string;
    rep9?: string;
    rep10?: string;
}) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Read data cells using full A1 notation (including sheet name) for safety across sheets
    let dataRangeObj;
    try {
        dataRangeObj = ss.getRange(ranges.dataRange);
    } catch (e) {
        ui.alert('Error reading data range: ' + e.toString());
        return;
    }

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

    // Read custom theme ranges
    let labels: any[], rep1: any[], rep2: any[];
    let rep3: any[], rep4: any[], rep5: any[], rep6: any[], rep7: any[], rep8: any[], rep9: any[], rep10: any[];
    try {
        // Read custom theme ranges (supports sheet-qualified A1 notation)
        labels = ss.getRange(ranges.labels).getValues().flat();
        rep1 = ss.getRange(ranges.rep1).getValues().flat();
        rep2 = ss.getRange(ranges.rep2).getValues().flat();
        rep3 = ss.getRange(ranges.rep3).getValues().flat();
        rep4 = ss.getRange(ranges.rep4).getValues().flat();
        rep5 = ss.getRange(ranges.rep5).getValues().flat();
        rep6 = ss.getRange(ranges.rep6).getValues().flat();
        rep7 = ss.getRange(ranges.rep7).getValues().flat();
        rep8 = ss.getRange(ranges.rep8).getValues().flat();
        rep9 = ss.getRange(ranges.rep9).getValues().flat();
        rep10 = ss.getRange(ranges.rep10).getValues().flat();
    } catch (e) {
        ui.alert('Error reading custom ranges: ' + e.toString());
        return;
    }

    if (
        labels.length !== rep1.length ||
        labels.length !== rep2.length ||
        labels.length !== rep3.length ||
        labels.length !== rep4.length ||
        labels.length !== rep5.length ||
        labels.length !== rep6.length ||
        labels.length !== rep7.length ||
        labels.length !== rep8.length ||
        labels.length !== rep9.length ||
        labels.length !== rep10.length
    ) {
        ui.alert('Selected ranges must have the same number of cells');
        return;
    }
    const themes = [];
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const reps = [rep1, rep2, rep3, rep4, rep5, rep6, rep7, rep8, rep9, rep10].map(arr => arr[i]);
        if (
            label != null &&
            label !== '' &&
            reps[0] != null && reps[0] !== '' &&
            reps[1] != null && reps[1] !== ''
        ) {
            themes.push({
                label: label.toString(),
                representatives: reps.map(r => r.toString()),
            });
        }
    }
    if (themes.length === 0) {
        ui.alert('No themes provided for allocation.');
        return;
    }
    // Perform allocation on the original data sheet
    writeAllocationsToSheet(
        await allocateThemes(inputs, themes, {
            fast: false,
            onProgress: (message: string) => {
                feedToast(message);
            },
        }),
        dataSheet,
        positions,
    );

    feedToast('Theme allocation complete');

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                SpreadsheetApp.setActiveSheet(dataSheet);
            },
            sheetName: dataSheet.getName(),
        });
    }
}
