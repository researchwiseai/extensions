import {
    allocateThemes as allocateThemesApi,
    ShortTheme,
} from 'pulse-common/themes';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { Pos } from 'pulse-common';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';

export async function allocateThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
) {
    console.log('Allocating themes from sheet', themeSheetName);

    const { sheet, inputs, positions } = await getSheetInputsAndPositions(
        context,
        range,
    );

    const themes = await getThemesFromSheet(context, themeSheetName);

    const allocations = await allocateThemesApi(inputs, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await writeAllocationsToSheet(positions, sheet, allocations, context);
}

export async function writeAllocationsToSheet(
    positions: Pos[],
    sheet: Excel.Worksheet,
    allocations: { theme: ShortTheme; score: number }[],
    context: Excel.RequestContext,
) {
    const batchSize = 1000;
    for (let i = 0; i < positions.length; i += batchSize) {
        const batch = positions.slice(i, i + batchSize);
        batch.forEach((pos, j) => {
            const cell = sheet.getCell(pos.row - 1, pos.col);
            cell.values = [[allocations[i + j].theme.label]];
        });
        await context.sync();
    }
}
