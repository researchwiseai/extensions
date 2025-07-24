import { multiCode } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';
import { ALLOCATION_THRESHOLD } from './constants';

export async function matrixThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
    hasHeader = false,
) {
    const startTime = Date.now();
    const { inputs, positions, themes, header } = await themeGenerationFlow(
        context,
        range,
        hasHeader,
    );
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const matrix = await multiCode(expanded, themes, {
        fast: false,
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
