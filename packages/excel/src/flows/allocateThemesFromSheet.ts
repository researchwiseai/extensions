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
import { applyTextColumnFormatting } from '../services/applyTextColumnFormatting';

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

    // Build and batch‑write column B using positions to align themes with input rows
    const rowCount = valuesToWrite.length;
    const bValues: string[][] = Array.from({ length: rowCount }, () => ['']);
    positions.forEach((pos, i) => {
        if (i === 0 && hasHeader) return; // Skip header row

        const alloc = allocations[i];
        if (!alloc.belowThreshold) {
            const idx = pos.row - rangeInfo.rowIndex - (hasHeader ? 1 : 0);
            if (idx >= 0 && idx < rowCount) {
                bValues[idx] = [alloc.theme.label];
            }
        }
    });
    const batchSize = 1000;
    for (let i = 0; i < rowCount; i += batchSize) {
        const start = hasHeader && i === 0 ? 1 : i;
        const batch = bValues.slice(start, i + batchSize);
        const startRow = 2 + i;
        const range = outputSheet
            .getRange(`B${startRow}`)
            .getResizedRange(batch.length - 1, 0);
        range.values = batch;
        await context.sync();
    }

    // Improve readability of the first column containing long text
    await applyTextColumnFormatting(outputSheet, context, 'A');

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
