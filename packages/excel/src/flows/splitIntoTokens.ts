import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

/**
 * Splits each input cell into tokens using wink-nlp and writes them into adjacent columns.
 */
export async function splitIntoTokensFlow(
    context: Excel.RequestContext,
    range: string,
): Promise<void> {
    console.log('splitIntoTokensFlow', range);
    const startTime = Date.now();
    const { inputs, positions, sheet, rangeInfo } = await getSheetInputsAndPositions(
        context,
        range,
    );

    const nlp = winkNLP(model);
    const tokenLists: string[][] = inputs.map((input) => {
        const doc = nlp.readDoc(input ?? '');
        return doc
            .tokens()
            .out()
            .filter((t: string) => t.trim() !== '');
    });

    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const maxTokens = Math.max(...tokenLists.map((t) => t.length));
    const outputSheet = context.workbook.worksheets.add(`Tokens_${Date.now()}`);
    const header = ['Text'];
    for (let i = 0; i < maxTokens; i++) {
        header.push(`Token ${i + 1}`);
    }
    outputSheet
        .getRangeByIndexes(0, 0, 1, header.length)
        .values = [header];
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - 1, 0);
    target.values = originalRange.values;

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: string }[] = [];

    positions.forEach((pos, i) => {
        const tokens = tokenLists[i];
        tokens.forEach((token, j) => {
            const rowIndex = pos.row - rangeInfo.rowIndex;
            const cell = outputSheet.getCell(rowIndex, j + 1);
            batch.push({ cell, value: token });

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

    await maybeActivateSheet(context, outputSheet, startTime);
}
