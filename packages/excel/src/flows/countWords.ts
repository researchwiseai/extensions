import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

/**
 * Counts words in each input cell using wink-nlp and writes counts into the next free column.
 */
export async function countWordsFlow(
    context: Excel.RequestContext,
    range: string,
): Promise<void> {
    console.log('countWordsFlow', range);
    const startTime = Date.now();
    const { inputs, positions, sheet, rangeInfo } = await getSheetInputsAndPositions(
        context,
        range,
    );

    const nlp = winkNLP(model);
    const wordCounts: number[] = inputs.map((input) => {
        const doc = nlp.readDoc(input ?? '');
        const tokens = doc
            .tokens()
            .out()
            .filter((t: string) => t.trim() !== '');
        return tokens.length;
    });

    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const outputSheet = context.workbook.worksheets.add(`WordCount_${Date.now()}`);
    outputSheet.getRange('A1:B1').values = [['Text', 'Word Count']];
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - 1, 0);
    target.values = originalRange.values;

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: number }[] = [];

    positions.forEach((pos, i) => {
        const count = wordCounts[i];
        const rowIndex = pos.row - rangeInfo.rowIndex;
        const cell = outputSheet.getCell(rowIndex, 1);
        batch.push({ cell, value: count });

        if (batch.length >= batchSize) {
            batch.forEach(({ cell, value }) => {
                cell.values = [[value]];
            });
            batch = [];
            context.sync();
        }
    });

    if (batch.length > 0) {
        batch.forEach(({ cell, value }) => {
            cell.values = [[value]];
        });
        await context.sync();
    }

    await maybeActivateSheet(context, outputSheet, startTime);
}
