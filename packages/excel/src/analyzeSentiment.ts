import { analyzeSentiment as analyzeSentimentApi } from 'pulse-common/api';
import { getSheetInputsAndPositions } from './services/getSheetInputsAndPositions';

export async function analyzeSentiment(
    context: Excel.RequestContext,
    range: string,
) {
    const { sheet, inputs, positions } = await getSheetInputsAndPositions(
        context,
        range,
    );

    const result = await analyzeSentimentApi(inputs, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });
    positions.forEach((pos, i) => {
        const sentiment = result.results[i].sentiment;
        const cell = sheet.getCell(pos.row - 1, pos.col);
        cell.values = [[sentiment]];
    });
    await context.sync();
}
