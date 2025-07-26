import { ShortTheme } from 'pulse-common';
import { mapResults } from 'pulse-common/output';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';
/**
 * Calls the similarity endpoint to assign each input to the closest theme.
 */

export function writeAllocationsToSheet(
    allocations: {
        theme: ShortTheme;
        score: number;
    }[],
    sheet,
    positions: { row: number; col: number }[],
) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const themes = allocations.map((a) => a.theme);

    mapResults(themes, positions, (pos, theme) => {
        sheet.getRange(pos.row, pos.col + 1).setValue(theme.label);
    });

    feedToast('Theme allocation complete');

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
