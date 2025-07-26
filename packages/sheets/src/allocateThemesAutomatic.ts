import { allocateThemes } from 'pulse-common/api';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { generateThemesFlow } from './generateThemes';
import { feedToast } from './feedToast';
import { maybeActivateSheet } from './maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

/**
 * Automatically generates themes and allocates themes to data.
 *
 * Called by FE
 *
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export async function allocateThemesAutomatic(
    dataRange: string,
    hasHeader = false,
) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();

    const {
        inputs: usedInputs,
        positions,
        dataRangeObj,
        themes,
        header,
    } = await generateThemesFlow(dataRange, hasHeader);

    feedToast('Theme generation complete. Starting allocation work');

    const allocations = await allocateThemes(usedInputs, themes, {
        fast: false,
        onProgress: (message: string) => {
            feedToast(message);
        },
    });

    // Write themes to a new sheet (Text and Theme columns)
    const output = ss.insertSheet(`Allocation_${Date.now()}`);
    const title = hasHeader && header ? header : 'Text';
    output.getRange(1, 1, 1, 2).setValues([[title, 'Theme']]);
    const inputsExpanded = expandWithBlankRows(usedInputs, positions);
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
