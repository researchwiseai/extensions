import { multiCode, getThemeSets } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';

export async function matrixThemesFromSetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSetName: string,
) {
    console.log('Allocating themes matrix from set', themeSetName);

    const { inputs } = await getSheetInputsAndPositions(context, range);

    const themeSets = await getThemeSets();
    const themeSet = themeSets.find((set) => set.name === themeSetName);
    if (!themeSet) {
        console.error(`Theme set "${themeSetName}" not found.`);
        return;
    }

    const matrix = await multiCode(inputs, themeSet.themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs,
        themes: themeSet.themes,
    });
}
