import { multiCode } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';

export async function matrixThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
) {
    console.log('Allocating themes matrix from sbeet', themeSheetName);

    const { inputs, positions } = await getSheetInputsAndPositions(context, range);
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const themes = await getThemesFromSheet(context, themeSheetName);

    const matrix = await multiCode(expanded, themes, {
        fast: false,
        normalize: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs: expanded,
        themes: themes,
    });
}
