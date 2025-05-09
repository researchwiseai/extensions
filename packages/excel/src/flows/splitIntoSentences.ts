import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';

export async function splitIntoSentencesFlow(
    context: Excel.RequestContext,
    range: string,
): Promise<void> {
    console.log('splitIntoSentencesFlow', range);
    const { inputs, positions, sheet } = await getSheetInputsAndPositions(
        context,
        range,
    );

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
        Array.from({ length: inputs.length }, () => ''),
    );

    console.log('sentences', sentences);
    console.log('result', result);

    positions.forEach((pos, i) => {
        const sens = sentences[i];
        sens.forEach((s, j) => {
            const cell = sheet.getCell(pos.row - 1, pos.col + j);
            cell.values = [[s.segment]];
        });
    });

    await context.sync();
}
