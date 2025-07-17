import { multiCode } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';

export async function matrixThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    const { inputs, positions, themes } = await themeGenerationFlow(context, range);
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const matrix = await multiCode(expanded, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs: expanded,
        themes,
    });
}
