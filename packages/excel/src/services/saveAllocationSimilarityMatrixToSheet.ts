import type { Theme } from 'pulse-common/api';
import type { ShortTheme } from 'pulse-common/themes';
import { maybeActivateSheet } from './maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

interface Props {
    matrix: (number | boolean)[][];
    context: Excel.RequestContext;
    inputs: string[];
    themes: (Theme | ShortTheme)[];
    sheetName?: string;
    startTime: number;
}

export async function saveAllocationMatrixToSheet({
    matrix,
    context,
    inputs,
    themes,
    sheetName,
    startTime,
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

    // write the range in batches of 1000 rows at a time
    const batchSize = 1000;
    for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        const range = sheet
            .getRange(`A${i + 1}`)
            .getResizedRange(batch.length - 1, batch[0].length - 1);
        range.values = batch;

        await context.sync();
    }

    // Make the first row bold, double height, and text wrapping
    const row1 = sheet.getRange('A1:AZ1');
    row1.format.font.bold = true;
    row1.format.rowHeight = 30;
    row1.format.wrapText = true;

    await maybeActivateSheet(context, sheet, startTime);

    const feed = getFeed();
    // Link all feed items created since this operation started to this sheet
    const itemsToUpdate = feed.filter((item) => item.createdAt >= startTime);
    if (itemsToUpdate.length > 0) {
        itemsToUpdate.forEach((item) =>
            updateItem({
                jobId: item.jobId,
                onClick: () => {
                    Excel.run(async (context) => {
                        context.workbook.worksheets.getItem(name).activate();
                        await context.sync();
                    });
                },
            }),
        );
    } else {
        const last = feed[feed.length - 1];
        if (last) {
            updateItem({
                jobId: last.jobId,
                onClick: () => {
                    Excel.run(async (context) => {
                        context.workbook.worksheets.getItem(name).activate();
                        await context.sync();
                    });
                },
            });
        }
    }
}
