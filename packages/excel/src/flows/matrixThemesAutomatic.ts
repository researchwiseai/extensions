import { multiCode } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';

export async function matrixThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    const { inputs, themes } = await themeGenerationFlow(context, range);

    const matrix = await multiCode(inputs, themes, {
        fast: false,
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
