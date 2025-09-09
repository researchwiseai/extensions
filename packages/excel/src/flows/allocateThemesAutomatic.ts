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
    let inputs: string[] = [];
    let positions: any[] = [];
    let sheet: Excel.Worksheet;
    let themes: any[] = [];
    let rangeInfo: any;
    let header: string | undefined;
    try {
        const res = await themeGenerationFlow(context, range, hasHeader, startTime);
        if (!res || !res.inputs || !res.themes) {
            // No selection made or generation aborted
            return;
        }
        ({ inputs, positions, sheet, themes, rangeInfo, header } = res as any);
    } catch (e: any) {
        // themeGenerationFlow now routes errors to the global handler with friendlier messages
        throw e;
    }

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
