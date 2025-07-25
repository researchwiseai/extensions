import type { Theme } from 'pulse-common';
import { saveThemesToSheet as saveCommon } from 'pulse-common/saveThemesToSheet';
import { maybeActivateSheet } from './maybeActivateSheet';

export async function writeThemesToSheet(
    themes: Theme[],
    startTime?: number,
): Promise<GoogleAppsScript.Spreadsheet.Sheet> {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let existed = true;
    const sheet = await saveCommon({
        themes,
        addSheet(name) {
            let s = ss.getSheetByName(name);
            if (!s) {
                existed = false;
                s = ss.insertSheet(name);
            }
            return s;
        },
        clearSheet(s) {
            if (existed) {
                s.clear();
            }
        },
        write(s, range, values) {
            if (range === 'A1:E1') {
                s.getRange(1, 1, 1, 5).setValues(values);
            } else if (range.startsWith('A2:E')) {
                const end = Number(range.slice(4));
                const rows = end - 1;
                const target = s.getRange(2, 1, rows, 5);
                if (values.length > 0) {
                    target.setValues(values);
                } else {
                    target.clear();
                }
            }
        },
    });

    if (typeof startTime === 'number') {
        maybeActivateSheet(sheet, startTime);
    }
    return sheet;
}
