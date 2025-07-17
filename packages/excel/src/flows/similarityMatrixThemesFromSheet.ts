import { splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';
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
    const startTime = Date.now();

    const { inputs, positions } = await getSheetInputsAndPositions(context, range);
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const themes = await getThemesFromSheet(context, themeSheetName);

    const matrix = await splitSimilarityMatrix(expanded, themes, {
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
        themes,
        startTime,
    });
}
