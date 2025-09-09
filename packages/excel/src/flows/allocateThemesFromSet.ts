import {
    allocateThemes as allocateThemesApi,
    getThemeSets,
    ShortTheme,
} from 'pulse-common/themes';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import { Pos } from 'pulse-common';
import { ALLOCATION_THRESHOLD } from './constants';
import { writeAllocationsOutput } from '../services/writeAllocationsOutput';

export async function allocateThemesFromSetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSetName: string,
    hasHeader = false,
) {
    console.log('Allocating themes from set', themeSetName);
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

    const themeSets = await getThemeSets();
    const themeSet = themeSets.find((set) => set.name === themeSetName);
    if (!themeSet) {
        console.error(`Theme set "${themeSetName}" not found.`);
        return;
    }

    const allocations = await allocateThemesApi(inputs, themeSet.themes, {
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

// sheet writing moved to shared service writeAllocationsOutput
