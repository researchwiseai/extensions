import { ShortTheme } from 'pulse-common/themes';
import { Pos } from 'pulse-common';
import { maybeActivateSheet } from './maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';
import { applyTextColumnFormatting } from './applyTextColumnFormatting';

export async function writeAllocationsOutput(opts: {
  context: Excel.RequestContext;
  sourceSheet: Excel.Worksheet;
  rangeInfo: { rowIndex: number; columnIndex: number; rowCount: number; columnCount: number };
  positions: Pos[];
  allocations: { theme: ShortTheme; score: number; belowThreshold: boolean }[];
  hasHeader?: boolean;
  headerText?: string;
  startTime?: number;
  sheetName?: string; // optional output sheet name; defaults to Allocation_<ts>
}) {
  const { context, sourceSheet, rangeInfo, positions, allocations } = opts;
  const hasHeader = !!opts.hasHeader;
  const headerText = hasHeader && opts.headerText ? opts.headerText : 'Text';
  const startTime = opts.startTime ?? Date.now();
  const name = opts.sheetName ?? `Allocation_${Date.now()}`;

  const originalRange = sourceSheet.getRangeByIndexes(
    rangeInfo.rowIndex,
    rangeInfo.columnIndex,
    rangeInfo.rowCount,
    rangeInfo.columnCount,
  );
  originalRange.load('values');
  await context.sync();

  const valuesToWrite = hasHeader ? originalRange.values.slice(1) : originalRange.values;
  const outputSheet = context.workbook.worksheets.add(name);
  outputSheet.getRange('A1:B1').values = [[headerText, 'Theme']];

  if (valuesToWrite.length > 0) {
    const aTarget = outputSheet.getRange('A2').getResizedRange(valuesToWrite.length - 1, 0);
    aTarget.values = valuesToWrite;

    // Build column B values aligned to A using positions
    const rowCount = valuesToWrite.length;
    const bValues: string[][] = Array.from({ length: rowCount }, () => ['']);
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const alloc = allocations[i];
      if (!alloc || alloc.belowThreshold) continue;
      const idx = pos.row - rangeInfo.rowIndex - (hasHeader ? 1 : 0);
      if (idx >= 0 && idx < rowCount) {
        bValues[idx] = [alloc.theme.label];
      }
    }
    const bTarget = outputSheet.getRange('B2').getResizedRange(rowCount - 1, 0);
    bTarget.values = bValues;
  }

  await applyTextColumnFormatting(outputSheet, context, 'A');
  await maybeActivateSheet(context, outputSheet, startTime);

  const feed = getFeed();
  const last = feed[feed.length - 1];
  if (last) {
    updateItem({
      jobId: last.jobId,
      onClick: () => {
        Excel.run(async (cx) => {
          cx.workbook.worksheets.getItem(name).activate();
          await cx.sync();
        });
      },
    });
  }

  return outputSheet;
}

