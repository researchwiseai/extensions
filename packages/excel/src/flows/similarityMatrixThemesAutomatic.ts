import { splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { themeGenerationFlow } from './themeGenerationFlow';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';

export async function similarityMatrixThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    console.log('Allocating themes similarity matrix automatically');

    const { inputs, positions, themes } = await themeGenerationFlow(context, range);
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const matrix = await splitSimilarityMatrix(expanded, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
        normalize: false,
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs: expanded,
        themes,
    });
}
