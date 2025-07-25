import { ShortTheme } from 'pulse-common';
import { mapResults } from 'pulse-common/output';
/**
 * Calls the similarity endpoint to assign each input to the closest theme.
 */

export function writeAllocationsToSheet(allocations: {
    theme: ShortTheme;
    score: number;
}[], sheet, positions: { row: number; col: number }[]) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const themes = allocations.map((a) => a.theme);

    mapResults(themes, positions, (pos, theme) => {
        sheet.getRange(pos.row, pos.col + 1).setValue(theme.label);
    });

    ss.toast('Theme allocation complete', 'Pulse');
}
