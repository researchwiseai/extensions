import { splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';
import { ALLOCATION_THRESHOLD } from './constants';

export async function similarityMatrixThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
    hasHeader = false,
) {
    console.log(
        'Allocating themes similarity matrix from sheet',
        themeSheetName,
    );
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
    const expanded = expandWithBlankRows(inputs, positions);

    const themes = await getThemesFromSheet(context, themeSheetName);

    const matrix = await splitSimilarityMatrix(expanded, themes, {
        fast: false,
        normalize: false,
        onProgress: (message) => {
            console.log(message);
        },
        threshold: ALLOCATION_THRESHOLD,
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs: expanded,
        themes,
        header,
        startTime,
    });
}
