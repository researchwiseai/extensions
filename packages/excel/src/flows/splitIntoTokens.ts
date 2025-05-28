import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
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
    const { inputs, positions, sheet } = await getSheetInputsAndPositions(
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

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: string }[] = [];

    positions.forEach((pos, i) => {
        const tokens = tokenLists[i];
        tokens.forEach((token, j) => {
            const cell = sheet.getCell(pos.row - 1, pos.col + j);
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
}
