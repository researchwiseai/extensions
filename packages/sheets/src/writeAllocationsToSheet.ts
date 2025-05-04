import { ShortTheme, Theme } from "pulse-common";
/**
 * Calls the similarity endpoint to assign each input to the closest theme.
 */

export function writeAllocationsToSheet(allocations: {
    theme: ShortTheme;
    score: number;
}[], sheet, positions: { row: number; col: number }[]) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const themes = allocations.map((a) => a.theme);

    positions.forEach((pos, i) => {
        sheet.getRange(pos.row, pos.col + 1).setValue(themes[i].label);
    });

    ss.toast('Theme allocation complete', 'Pulse');
}
