import { extractInputs } from 'pulse-common/input';
import { getThemeSets, splitSimilarityMatrix } from 'pulse-common/themes';
import { saveAllocationMatrixToSheet } from '../services/saveAllocationSimilarityMatrixToSheet';

export async function similarityMatrixThemesFromSetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSetName: string,
) {
    console.log('Allocating themes similarity matrix from set', themeSetName);

    const parts = range.split('!');
    const sheetName = parts[0];
    const rangeNotation = parts.slice(1).join('!');
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const target = sheet.getRange(rangeNotation);
    target.load(['values', 'rowIndex', 'columnIndex']);

    await context.sync();

    const values = target.values;
    const { inputs } = extractInputs(values, {
        rowOffset: target.rowIndex + 1,
        colOffset: target.columnIndex + 1,
    });

    if (inputs.length === 0) {
        console.warn(
            'No text found in selected data range for theme generation.',
        );
        return;
    }

    const themeSets = await getThemeSets();
    const themeSet = themeSets.find((set) => set.name === themeSetName);
    if (!themeSet) {
        console.error(`Theme set "${themeSetName}" not found.`);
        return;
    }

    const matrix = await splitSimilarityMatrix(inputs, themeSet.themes, {
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
