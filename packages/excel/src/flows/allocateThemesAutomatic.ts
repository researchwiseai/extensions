import { allocateThemes as allocateThemesApi } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { writeAllocationsToSheet } from './allocateThemesFromSet';
import { ALLOCATION_THRESHOLD } from './constants';

export async function allocateThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    const { inputs, positions, sheet, themes, rangeInfo } = await themeGenerationFlow(
        context,
        range,
    );

    const allocations = await allocateThemesApi(inputs, themes, {
        fast: false,
        threshold: ALLOCATION_THRESHOLD,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await writeAllocationsToSheet(
        positions,
        sheet,
        allocations,
        context,
        rangeInfo,
    );
}
