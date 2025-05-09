import type { Theme } from 'pulse-common/api';
import type { ShortTheme } from 'pulse-common/themes';

interface Props {
    matrix: (number | boolean)[][];
    context: Excel.RequestContext;
    inputs: string[];
    themes: (Theme | ShortTheme)[];
    sheetName?: string;
}

export async function saveAllocationMatrixToSheet({
    matrix,
    context,
    inputs,
    themes,
    sheetName,
}: Props): Promise<void> {
    // generate a unique name if none provided
    const name = sheetName ?? `Allocation_${Date.now()}`;

    // add a new sheet
    const sheet = context.workbook.worksheets.add(name);

    // build headers: first cell blank, then theme shortLabels
    const headerRow = [
        '',
        ...themes.map((t) =>
            'shortLabel' in t && t.shortLabel.length > 0
                ? t.shortLabel
                : t.label,
        ),
    ];

    // build data rows: first column is input label, then 1/0 values
    const dataRows = matrix.map((row, i) => [
        inputs[i],
        ...row.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)),
    ]);

    // combine headers and data
    const values = [headerRow, ...dataRows];

    // write the range starting at A1
    const range = sheet
        .getRange('A1')
        .getResizedRange(values.length - 1, values[0].length - 1);
    range.values = values;

    // // Make the whole of row A bold, double height and text wrapping
    // const colA = sheet.getRange('A1:A1000');
    // colA.format.font.bold = true;
    // colA.format.columnWidth = 50;

    // Make the first column bold and double width
    const row1 = sheet.getRange('A1:AZ1');
    row1.format.font.bold = true;
    row1.format.rowHeight = 30;
    row1.format.wrapText = true;

    // make it visible/active if you want
    sheet.activate();

    await context.sync();
}
