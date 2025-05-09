import { extractInputs } from 'pulse-common/input';

export async function getSheetInputsAndPositions(
    context: Excel.RequestContext,
    range: string,
) {
    let sheet: Excel.Worksheet;
    let rangeNotation: string;

    // Find the first '!' separator
    const sep = range.indexOf('!');
    if (sep === -1) {
        // No sheet name specified: use active worksheet
        sheet = context.workbook.worksheets.getActiveWorksheet();
        rangeNotation = range;
    } else {
        // Extract and un‐quote sheet name
        let sheetName = range.slice(0, sep);
        const m = sheetName.match(/^'(.*)'$/);
        if (m) {
            sheetName = m[1]; // strip surrounding single quotes
        }
        rangeNotation = range.slice(sep + 1);

        // Try to get the named sheet; fall back to active sheet on error
        try {
            sheet = context.workbook.worksheets.getItem(sheetName);
        } catch {
            console.warn(`Sheet "${sheetName}" not found. Using active sheet.`);
            sheet = context.workbook.worksheets.getActiveWorksheet();
        }
    }

    const target = sheet.getRange(rangeNotation);
    target.load(['values', 'rowIndex', 'columnIndex']);

    await context.sync();

    const values = target.values;
    const { inputs, positions } = extractInputs(values, {
        rowOffset: target.rowIndex + 1,
        colOffset: target.columnIndex + 1,
    });

    if (inputs.length === 0) {
        console.error('No text found in selected data range');
        throw new Error('No text found in selected data range');
    }

    return {
        sheet,
        inputs,
        positions,
    };
}
