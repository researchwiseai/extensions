import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import { applyTextColumnFormatting } from '../services/applyTextColumnFormatting';

function process(inputs: string[]): string[][] {
    // @ts-expect-error Missing type definition for Intl.Segmenter
    const segmenterEn = new Intl.Segmenter('en', { granularity: 'sentence' });

    return inputs.map((input) =>
        Array.from(segmenterEn.segment(input)).map(
            (s) =>
                (s as { index: number; input: string; segment: string })
                    .segment,
        ),
    );
}

export async function splitIntoSentencesFlow(
    context: Excel.RequestContext,
    range: string,
): Promise<void> {
    console.log('splitIntoSentencesFlow', range);
    const startTime = Date.now();

    // Create output sheet and write header
    const outputSheet = context.workbook.worksheets.add(
        `Sentences_${Date.now()}`,
    );

    // Get inputs and positions from the specified range
    const { inputs, positions, sheet, rangeInfo } =
        await getSheetInputsAndPositions(context, range);

    // Split inputs into sentences
    const sentences = process(inputs);
    const maxSentences = Math.max(...sentences.map((s) => s.length));

    // Read original range values
    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const header = ['Text'];
    for (let i = 0; i < maxSentences; i++) {
        header.push(`Sentence ${i + 1}`);
    }
    outputSheet.getRangeByIndexes(0, 0, 1, header.length).values = [header];
    // Bold header row
    try {
        outputSheet.getRangeByIndexes(0, 0, 1, header.length).format.font.bold =
            true;
    } catch {}
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - 1, 0);
    target.values = originalRange.values;

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: string }[] = [];

    positions.forEach((pos, i) => {
        const sens = sentences[i];
        sens.forEach((value, j) => {
            const rowIndex = pos.row - rangeInfo.rowIndex;
            const cell = outputSheet.getCell(rowIndex, j + 1);
            batch.push({ cell, value });

            if (batch.length >= batchSize) {
                batch.forEach(({ cell, value }) => {
                    cell.values = [[value]];
                });
                batch = [];
                context.sync();
            }
        });
    });

    if (batch.length > 0) {
        batch.forEach(({ cell, value }) => {
            cell.values = [[value]];
        });
        await context.sync();
    }

    // Improve readability of the first column containing long text
    await applyTextColumnFormatting(outputSheet, context, 'A');

    await maybeActivateSheet(context, outputSheet, startTime);
    try {
        context.trackedObjects.remove(outputSheet);
    } catch {}
}
