import { multiCode } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';
import { ALLOCATION_THRESHOLD } from './constants';

export async function matrixThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
    hasHeader = false,
) {
    console.log('Allocating themes matrix from sbeet', themeSheetName);
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
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const themes = await getThemesFromSheet(context, themeSheetName);

    const matrix = await multiCode(expanded, themes, {
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
        themes: themes,
        header,
        startTime,
    });
}
