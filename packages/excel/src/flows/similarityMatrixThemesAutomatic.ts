import { splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { themeGenerationFlow } from './themeGenerationFlow';

export async function similarityMatrixThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    console.log('Allocating themes similarity matrix automatically');

    const { inputs, themes } = await themeGenerationFlow(context, range);

    const matrix = await splitSimilarityMatrix(inputs, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
        normalize: false,
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs,
        themes,
    });
}
