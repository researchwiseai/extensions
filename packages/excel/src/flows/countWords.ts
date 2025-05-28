import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
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
    const { inputs, positions, sheet } = await getSheetInputsAndPositions(
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

    // Determine offset for output column (next to selected range)
    const cols = positions.map((p) => p.col);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    const offset = maxCol - minCol;

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: number }[] = [];

    positions.forEach((pos, i) => {
        const count = wordCounts[i];
        const cell = sheet.getCell(pos.row - 1, pos.col + offset);
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
}
