import { allocateThemes as allocateThemesApi } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';
import { writeAllocationsOutput } from '../services/writeAllocationsOutput';
import { ALLOCATION_THRESHOLD } from './constants';

export async function allocateThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
    hasHeader = false,
) {
    const startTime = Date.now();
    const { inputs, positions, sheet, themes, rangeInfo, header } =
        await themeGenerationFlow(context, range, hasHeader, startTime);

    const allocations = await allocateThemesApi(inputs, themes, {
        fast: false,
        threshold: ALLOCATION_THRESHOLD,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await writeAllocationsOutput({
        context,
        sourceSheet: sheet,
        rangeInfo,
        positions,
        allocations,
        hasHeader,
        headerText: header,
        startTime,
    });
}
