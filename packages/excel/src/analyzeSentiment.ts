import { analyzeSentiment as analyzeSentimentApi } from 'pulse-common/api';
import { getSheetInputsAndPositions } from './services/getSheetInputsAndPositions';
import { maybeActivateSheet } from './services/maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function analyzeSentiment(
    context: Excel.RequestContext,
    range: string,
    hasHeader = false,
) {
    const startTime = Date.now();
    const {
        sheet,
        inputs: rawInputs,
        positions: rawPositions,
        rangeInfo,
    } = await getSheetInputsAndPositions(context, range);

    let header: string | undefined;
    let inputs = rawInputs;
    let positions = rawPositions;
    if (hasHeader) {
        // Read header cell and exclude it from inputs and positions
        const headerCell = sheet.getRangeByIndexes(
            rangeInfo.rowIndex,
            rangeInfo.columnIndex,
            1,
            1,
        );
        headerCell.load('values');
        await context.sync();
        header = String(headerCell.values[0][0] ?? '');
        inputs = rawInputs.slice(1);
        positions = rawPositions.slice(1);
    }

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

    const name = `Sentiment_${Date.now()}`;
    const outputSheet = context.workbook.worksheets.add(name);
    // Write header using custom header label if provided
    const headerLabel = hasHeader && header ? header : 'Text';
    outputSheet.getRange('A1:B1').values = [[headerLabel, 'Sentiment']];
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - (hasHeader ? 2 : 1), 0);
    // Write values, skipping header row if present
    const valuesToWrite = hasHeader
        ? originalRange.values.slice(1)
        : originalRange.values;
    target.values = valuesToWrite;

    positions.forEach((pos, i) => {
        const sentiment = result.results[i].sentiment;
        const rowIndex = pos.row - rangeInfo.rowIndex - (hasHeader ? 1 : 0);
        const cell = outputSheet.getCell(rowIndex, 1);
        cell.values = [[sentiment]];
    });
    await context.sync();

    await maybeActivateSheet(context, outputSheet, startTime);

    const feed = getFeed();
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
