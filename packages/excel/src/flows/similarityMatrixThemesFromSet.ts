import { getThemeSets, splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { expandWithBlankRows } from 'pulse-common/dataUtils';
import { ALLOCATION_THRESHOLD } from './constants';

export async function similarityMatrixThemesFromSetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSetName: string,
    hasHeader = false,
) {
    console.log('Allocating themes similarity matrix from set', themeSetName);
    const startTime = Date.now();

    const {
        sheet,
        inputs: rawInputs,
        positions: rawPositions,
        rangeInfo,
    } = await getSheetInputsAndPositions(context, range);
    let header: string | undefined;
    let inputs = rawInputs;
    let positions = rawPositions;
    if (hasHeader) {
        const headerCell = sheet.getRangeByIndexes(
            rangeInfo.rowIndex,
            rangeInfo.columnIndex,
            1,
            1,
        );
        headerCell.load('values');
        await context.sync();
        header = String(headerCell.values[0][0] ?? '');
        inputs = rawInputs.slice(1);
        positions = rawPositions.slice(1);
    }
    const expanded = expandWithBlankRows(inputs, positions);

    const themeSets = await getThemeSets();
    const themeSet = themeSets.find((set) => set.name === themeSetName);
    if (!themeSet) {
        console.error(`Theme set "${themeSetName}" not found.`);
        return;
    }

    const matrix = await splitSimilarityMatrix(expanded, themeSet.themes, {
        fast: false,
        normalize: false,
        onProgress: (message) => {
            console.log(message);
        },
        threshold: ALLOCATION_THRESHOLD,
    });

    await saveAllocationMatrixToSheet({
        context,
        matrix,
        inputs: expanded,
        themes: themeSet.themes,
        header,
        startTime,
    });
}
