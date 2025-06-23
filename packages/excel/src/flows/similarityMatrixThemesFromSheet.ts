import { splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';

export async function similarityMatrixThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
) {
    console.log(
        'Allocating themes similarity matrix from sheet',
        themeSheetName,
    );

    const { inputs } = await getSheetInputsAndPositions(context, range);

    const themes = await getThemesFromSheet(context, themeSheetName);

    const matrix = await splitSimilarityMatrix(inputs, themes, {
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
        themes,
    });
}
