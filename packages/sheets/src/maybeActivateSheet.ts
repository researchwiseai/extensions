export function maybeActivateSheet(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    startTime: number,
    thresholdMs = 20000,
): void {
    if (Date.now() - startTime <= thresholdMs) {
        SpreadsheetApp.setActiveSheet(sheet);
        Utilities.sleep(50);
    }
}
