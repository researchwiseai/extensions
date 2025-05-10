import { allocateThemes as allocateThemesApi } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { writeAllocationsToSheet } from './allocateThemesFromSet';

export async function allocateThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    const { inputs, positions, sheet, themes } = await themeGenerationFlow(
        context,
        range,
    );

    const allocations = await allocateThemesApi(inputs, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await writeAllocationsToSheet(positions, sheet, allocations, context);
}
