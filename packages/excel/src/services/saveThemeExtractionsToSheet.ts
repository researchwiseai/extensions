import { applyTextColumnFormatting } from './applyTextColumnFormatting';

export async function saveThemeExtractionsToSheet(opts: {
    context: Excel.RequestContext;
    inputs: string[];
    headerText?: string; // header for column A
    labels: string[]; // theme labels (dictionary)
    results: string[][][]; // per input, per label list of matches
    sheetName?: string; // optional output sheet name
}) {
    const {
        context,
        inputs,
        headerText = 'Text',
        labels,
        results,
        sheetName,
    } = opts;

    const name = sheetName ?? `Theme_Extraction_${Date.now()}`;
    const sheet = context.workbook.worksheets.add(name);
    try {
        context.trackedObjects.add(sheet);
    } catch {}
    console.log('[ThemeSheet] Created sheet', name);

    const toCell = (arr: string[] | undefined) =>
        Array.isArray(arr) ? arr.join('; ') : '';

    // Headers: A = Text, then one column per label
    const headerRow = [headerText, ...labels];
    const lastColIndex = Math.max(1 + labels.length, 1);
    const lastColLetter = getColumnLetter(lastColIndex);
    const headerRange = sheet.getRange(`A1:${lastColLetter}1`);
    headerRange.values = [headerRow];
    console.log('[ThemeSheet] Wrote header row with', labels.length, 'theme columns');
    try {
        // Mirror theme sheet styling
        headerRange.format.fill.color = '#D9EAD3';
        headerRange.format.font.bold = true;
        headerRange.format.horizontalAlignment =
            Excel.HorizontalAlignment.center;
        headerRange.format.borders.getItem('EdgeBottom').style =
            Excel.BorderLineStyle.double;
        headerRange.format.rowHeight = 30;
        headerRange.format.wrapText = true;
    } catch {}

    // Column A values
    if (inputs.length > 0) {
        const aTarget = sheet
            .getRange('A2')
            .getResizedRange(inputs.length - 1, 0);
        aTarget.values = inputs.map((t) => [t]);
        console.log('[ThemeSheet] Wrote', inputs.length, 'inputs to column A');
    }

    // Normalize results to a dense [input][label] -> string[] shape
    const rows = Math.min(inputs.length, results.length ?? 0);
    const cols = labels.length;
    const normalized: string[][][] = Array.from({ length: inputs.length }, (_, i) => {
        const row = Array.isArray(results?.[i]) ? (results[i] as unknown[]) : [];
        return Array.from({ length: cols }, (_, j) => {
            const cell = (row as any[])[j];
            if (Array.isArray(cell)) return cell as string[];
            if (typeof cell === 'string') return [cell];
            return [] as string[];
        });
    });
    console.log('[ThemeSheet] Normalized matrix', { rows, cols, inputs: inputs.length });

    // Theme columns
    for (let j = 0; j < labels.length; j++) {
        const colIndex = 1 + j; // B=1
        const colLetter = getColumnLetter(colIndex + 1);
        const colRange = sheet
            .getRange(`${colLetter}2`)
            .getResizedRange(Math.max(rows - 1, 0), 0);
        const colValues: string[][] = Array.from({ length: rows }, (_, i) => [
            toCell(normalized[i]?.[j] as string[] | undefined),
        ]);
        const nonEmptyRows = colValues.reduce(
            (acc, [v]) => acc + (v && v.length > 0 ? 1 : 0),
            0,
        );
        console.log(
            `[ThemeSheet] Writing column ${colLetter} (${labels[j]}) -> rows=${rows}, nonEmpty=${nonEmptyRows}`,
        );
        if (rows > 0) colRange.values = colValues;
    }

    // Formatting: text column width + wrapping, then autofit remaining columns
    // Ensure writes are flushed before formatting
    await opts.context.sync();
    console.log('[ThemeSheet] Values flushed to workbook');
    await applyTextColumnFormatting(sheet, opts.context, 'A');
    console.log('[ThemeSheet] Completed writing and formatting theme extractions');
    try { sheet.getUsedRange().format.autofitColumns(); } catch {}

    try {
        context.trackedObjects.remove(sheet);
    } catch {}
    return sheet;
}

function getColumnLetter(index1Based: number): string {
    let result = '';
    let n = index1Based;
    while (n > 0) {
        const rem = (n - 1) % 26;
        result = String.fromCharCode(65 + rem) + result;
        n = Math.floor((n - 1) / 26);
    }
    return result;
}
