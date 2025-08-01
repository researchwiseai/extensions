import { splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { themeGenerationFlow } from './themeGenerationFlow';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { ALLOCATION_THRESHOLD } from './constants';

export async function similarityMatrixThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
    hasHeader = false,
) {
    console.log('Allocating themes similarity matrix automatically');
    const startTime = Date.now();

    const { inputs, positions, themes, header } = await themeGenerationFlow(
        context,
        range,
        hasHeader,
    );
    const expanded = expandWithBlankRows(inputs, positions);

    const matrix = await splitSimilarityMatrix(expanded, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
        normalize: false,
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
