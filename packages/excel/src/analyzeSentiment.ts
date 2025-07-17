import { analyzeSentiment as analyzeSentimentApi } from 'pulse-common/api';
import { getSheetInputsAndPositions } from './services/getSheetInputsAndPositions';
import { maybeActivateSheet } from './services/maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function analyzeSentiment(
    context: Excel.RequestContext,
    range: string,
) {
    const startTime = Date.now();
    const { sheet, inputs, positions, rangeInfo } =
        await getSheetInputsAndPositions(context, range);

    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const result = await analyzeSentimentApi(inputs, {
        fast: inputs.length < 200,
        onProgress: (message) => {
            console.log(message);
        },
        ignoreCache: true,
    });

    const outputSheet = context.workbook.worksheets.add(
        `Sentiment_${Date.now()}`,
    );
    outputSheet.getRange('A1:B1').values = [['Text', 'Sentiment']];
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - 1, 0);
    target.values = originalRange.values;

    positions.forEach((pos, i) => {
        const sentiment = result.results[i].sentiment;
        const rowIndex = pos.row - rangeInfo.rowIndex;
        const cell = outputSheet.getCell(rowIndex, 1);
        cell.values = [[sentiment]];
    });
    await context.sync();

    await maybeActivateSheet(context, outputSheet, startTime);

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        const name = outputSheet.name;
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
