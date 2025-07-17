import { multiCode, getThemeSets } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { expandInputsWithBlankRows } from '../services/expandInputsWithBlankRows';

export async function matrixThemesFromSetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSetName: string,
) {
    console.log('Allocating themes matrix from set', themeSetName);
    const startTime = Date.now();

    const { inputs, positions } = await getSheetInputsAndPositions(context, range);
    const expanded = expandInputsWithBlankRows(inputs, positions);

    const themeSets = await getThemeSets();
    const themeSet = themeSets.find((set) => set.name === themeSetName);
    if (!themeSet) {
        console.error(`Theme set "${themeSetName}" not found.`);
        return;
    }

    const matrix = await multiCode(expanded, themeSet.themes, {
        fast: false,
        normalize: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs: expanded,
        themes: themeSet.themes,
        startTime,
    });
}
