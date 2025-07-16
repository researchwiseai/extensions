import {
    allocateThemes as allocateThemesApi,
    ShortTheme,
} from 'pulse-common/themes';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { Pos } from 'pulse-common';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';
import { ALLOCATION_THRESHOLD } from './constants';

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
        threshold: ALLOCATION_THRESHOLD,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await writeAllocationsToSheet(positions, sheet, allocations, context);
}

export async function writeAllocationsToSheet(
    positions: Pos[],
    sheet: Excel.Worksheet,
    allocations: { theme: ShortTheme; score: number; belowThreshold: boolean }[],
    context: Excel.RequestContext,
) {
    const batchSize = 1000;
    for (let i = 0; i < positions.length; i += batchSize) {
        const batch = positions.slice(i, i + batchSize);
        batch.forEach((pos, j) => {
            const alloc = allocations[i + j];
            const cell = sheet.getCell(pos.row - 1, pos.col);
            cell.values = [[alloc.theme.label]];
            if (alloc.belowThreshold) {
                cell.format.fill.color = '#FFF2CC';
            }
        });
        await context.sync();
    }
}
