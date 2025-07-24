import {
    allocateThemes as allocateThemesApi,
    ShortTheme,
} from 'pulse-common/themes';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';
import { Pos } from 'pulse-common';
import { getThemesFromSheet } from './helpers/getThemesFromSheet';
import { ALLOCATION_THRESHOLD } from './constants';

export async function allocateThemesFromSheetFlow(
    context: Excel.RequestContext,
    range: string,
    themeSheetName: string,
    hasHeader = false,
) {
    console.log('Allocating themes from sheet', themeSheetName);
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

    const themes = await getThemesFromSheet(context, themeSheetName);

    const allocations = await allocateThemesApi(inputs, themes, {
        fast: false,
        threshold: ALLOCATION_THRESHOLD,
        onProgress: (message) => {
            console.log(message);
        },
    });

    await writeAllocationsToSheet(
        positions,
        sheet,
        allocations,
        context,
        rangeInfo,
        startTime,
        hasHeader,
        header,
    );
}

export async function writeAllocationsToSheet(
    positions: Pos[],
    sheet: Excel.Worksheet,
    allocations: {
        theme: ShortTheme;
        score: number;
        belowThreshold: boolean;
    }[],
    context: Excel.RequestContext,
    rangeInfo: {
        rowIndex: number;
        columnIndex: number;
        rowCount: number;
        columnCount: number;
    },
    startTime: number,
    hasHeader = false,
    header?: string,
) {
    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const name = `Allocation_${Date.now()}`;
    const outputSheet = context.workbook.worksheets.add(name);
    const headerLabel = hasHeader && header ? header : 'Text';
    outputSheet.getRange('A1:B1').values = [[headerLabel, 'Theme']];
    const valuesToWrite = hasHeader
        ? originalRange.values.slice(1)
        : originalRange.values;
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(valuesToWrite.length - 1, 0);
    target.values = valuesToWrite;

    const batchSize = 1000;
    for (let i = 0; i < positions.length; i += batchSize) {
        const batch = positions.slice(i, i + batchSize);
        batch.forEach((pos, j) => {
            const alloc = allocations[i + j];
            const rowIndex = pos.row - rangeInfo.rowIndex - (hasHeader ? 1 : 0);
            const cell = outputSheet.getCell(rowIndex, 1);
            cell.values = [[alloc.theme.label]];
            if (alloc.belowThreshold) {
                cell.format.fill.color = '#FFF2CC';
            }
        });
        await context.sync();
    }

    await maybeActivateSheet(context, outputSheet, startTime);

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                Excel.run(async (context) => {
                    context.workbook.worksheets.getItem(name).activate();
                    await context.sync();
                });
            },
        });
    }
}
