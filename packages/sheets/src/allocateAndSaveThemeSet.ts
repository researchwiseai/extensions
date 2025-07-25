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
    try {
        // Read custom theme ranges (supports sheet-qualified A1 notation)
        labels = ss.getRange(ranges.labels).getValues().flat();
        rep1 = ss.getRange(ranges.rep1).getValues().flat();
        rep2 = ss.getRange(ranges.rep2).getValues().flat();
    } catch (e) {
        ui.alert('Error reading custom ranges: ' + e.toString());
        return;
    }

    if (labels.length !== rep1.length || labels.length !== rep2.length) {
        ui.alert('Selected ranges must have the same number of cells');
        return;
    }
    const themes = [];
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const ex1 = rep1[i];
        const ex2 = rep2[i];
        if (
            label != null &&
            label !== '' &&
            ex1 != null &&
            ex1 !== '' &&
            ex2 != null &&
            ex2 !== ''
        ) {
            themes.push({
                label: label.toString(),
                representatives: [ex1.toString(), ex2.toString()],
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
            }
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
