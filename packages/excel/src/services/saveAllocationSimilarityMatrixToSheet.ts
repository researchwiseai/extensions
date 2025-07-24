import type { Theme } from 'pulse-common/api';
import type { ShortTheme } from 'pulse-common/themes';
import { maybeActivateSheet } from './maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

interface Props {
    matrix: (number | boolean)[][];
    context: Excel.RequestContext;
    inputs: string[];
    themes: (Theme | ShortTheme)[];
    header?: string;
    sheetName?: string;
    startTime: number;
}

export async function saveAllocationMatrixToSheet({
    matrix,
    context,
    inputs,
    themes,
    header,
    sheetName,
    startTime,
}: Props): Promise<void> {
    // generate a unique name if none provided
    const name = sheetName ?? `Allocation_${Date.now()}`;

    // add a new sheet
    const sheet = context.workbook.worksheets.add(name);

    // build headers: first cell is original header (if any), then theme shortLabels
    const headerRow = [
        header ?? '',
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

    const isBoolean = typeof matrix[0][0] === 'boolean';

    // Range for the data (excluding header)
    const dataRange = sheet.getRangeByIndexes(
        1,
        1,
        dataRows.length,
        headerRow.length - 1,
    );

    // TODO: Temporarily disabled conditional formatting
    // if (isBoolean) {
    //     // 1s light green
    //     const greenConFormat = dataRange.conditionalFormats.add(
    //         Excel.ConditionalFormatType.cellValue,
    //     );

    //     greenConFormat.cellValue.rule = {
    //         formula1: '=1',
    //         operator: Excel.ConditionalCellValueOperator.equalTo,
    //     };
    //     greenConFormat.cellValue.format.fill.color = '#B9F6CA'; // light green, good contrast with black text

    //     // 0s light red
    //     const redConFormat = dataRange.conditionalFormats.add(
    //         Excel.ConditionalFormatType.cellValue,
    //     );
    //     redConFormat.cellValue.rule = {
    //         formula1: '=0',
    //         operator: Excel.ConditionalCellValueOperator.equalTo,
    //     };
    //     redConFormat.cellValue.format.fill.color = '#FFCDD2'; // light red, good contrast with black text
    // } else {
    //     const blanks = dataRange.conditionalFormats.add(
    //         Excel.ConditionalFormatType.cellValue,
    //     );
    //     blanks.cellValue.rule = {
    //         formula1: '0',
    //         operator: Excel.ConditionalCellValueOperator.equalTo,
    //     };
    //     blanks.cellValue.format.fill.color = '#FFFFFF'; // white for blanks

    //     // Color scale: 0 = light red, 0.6 = light green, 1 = medium green
    //     const cf = dataRange.conditionalFormats.add(
    //         Excel.ConditionalFormatType.colorScale,
    //     );
    //     cf.colorScale.criteria = {
    //         minimum: {
    //             type: Excel.ConditionalFormatColorCriterionType.lowestValue,
    //             color: '#FFCDD2', // light red
    //         },
    //         midpoint: {
    //             type: Excel.ConditionalFormatColorCriterionType.number,
    //             formula: '0.6',
    //             color: '#B9F6CA', // light green
    //         },
    //         maximum: {
    //             type: Excel.ConditionalFormatColorCriterionType.highestValue,
    //             color: '#69F0AE', // medium green
    //         },
    //     };
    // }

    if (!isBoolean) {
        // Set the number format for the data range to percentage with no decimal places
        dataRange.numberFormat = [['0%']];
    }

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
    if (itemsToUpdate.length === 0) {
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
