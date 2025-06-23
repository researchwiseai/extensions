import { multiCode } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';

export async function matrixThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
) {
    console.log('Allocating themes matrix from sbeet', themeSheetName);

    const { inputs } = await getSheetInputsAndPositions(context, range);

    const themes = await getThemesFromSheet(context, themeSheetName);

    const matrix = await multiCode(inputs, themes, {
        fast: false,
        normalize: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs,
        themes: themes,
    });
}
