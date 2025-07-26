export function readThemesFromSheet(
    sheetName: string,
): { label: string; representatives: string[] }[] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        throw new Error('Sheet not found: ' + sheetName);
    }
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
        throw new Error('Sheet "' + sheetName + '" has no data');
    }
    const rows = values.slice(1);
    const themes: { label: string; representatives: string[] }[] = [];
    rows.forEach((row) => {
        const label = row[0];
        const rep1 = row[3];
        const rep2 = row[4];
        if (label) {
            const reps: string[] = [];
            if (rep1) reps.push(String(rep1));
            if (rep2) reps.push(String(rep2));
            themes.push({ label: String(label), representatives: reps });
        }
    });
    return themes;
}
