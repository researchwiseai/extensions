import { multiCode } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
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
    const expanded = expandWithBlankRows(inputs, positions);

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
