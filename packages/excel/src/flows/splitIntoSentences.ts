import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import { applyTextColumnFormatting } from '../services/applyTextColumnFormatting';

export async function splitIntoSentencesFlow(
    context: Excel.RequestContext,
    range: string,
): Promise<void> {
    console.log('splitIntoSentencesFlow', range);
    const startTime = Date.now();
    const { inputs, positions, sheet, rangeInfo } =
        await getSheetInputsAndPositions(context, range);

    // @ts-expect-error Missing type definition for Intl.Segmenter
    const segmenterEn = new Intl.Segmenter('en', { granularity: 'sentence' });

    const sentences = inputs.map(
        (input) =>
            Array.from(segmenterEn.segment(input)) as {
                index: number;
                input: string;
                segment: string;
            }[],
    );
    const maxSentences = Math.max(...sentences.map((s) => s.length));
    const result = Array.from({ length: maxSentences }, () =>
        Array.from({ length: positions.length }, () => ''),
    );

    console.log('sentences', sentences);
    console.log('result', result);

    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const outputSheet = context.workbook.worksheets.add(
        `Sentences_${Date.now()}`,
    );
    try { context.trackedObjects.add(outputSheet); } catch {}
    const header = ['Text'];
    for (let i = 0; i < maxSentences; i++) {
        header.push(`Sentence ${i + 1}`);
    }
    outputSheet.getRangeByIndexes(0, 0, 1, header.length).values = [header];
    // Bold header row
    try {
        outputSheet.getRangeByIndexes(0, 0, 1, header.length).format.font.bold = true;
    } catch {}
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - 1, 0);
    target.values = originalRange.values;

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: string }[] = [];

    positions.forEach((pos, i) => {
        const sens = sentences[i];
        sens.forEach((s, j) => {
            const rowIndex = pos.row - rangeInfo.rowIndex;
            const cell = outputSheet.getCell(rowIndex, j + 1);
            batch.push({ cell, value: s.segment });

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
    try { context.trackedObjects.remove(outputSheet); } catch {}
}
