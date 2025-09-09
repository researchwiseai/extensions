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
  // Write headers: Text, Coded Theme (thresholded), Best Fit (always best even if below threshold)
  outputSheet.getRange('A1:C1').values = [[headerText, 'Coded Theme', 'Best Fit']];
  // Bold header row
  try {
    outputSheet.getRange('A1:C1').format.font.bold = true;
  } catch {}

  if (valuesToWrite.length > 0) {
    const aTarget = outputSheet.getRange('A2').getResizedRange(valuesToWrite.length - 1, 0);
    aTarget.values = valuesToWrite;

    // Build column B and C values aligned to A using positions
    const rowCount = valuesToWrite.length;
    const bValues: string[][] = Array.from({ length: rowCount }, () => ['']);
    const cValues: string[][] = Array.from({ length: rowCount }, () => ['']);
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const alloc = allocations[i];
      if (!alloc) continue;
      // Convert absolute 1-based Excel row to zero-based index in valuesToWrite
      const idx = pos.row - (rangeInfo.rowIndex + 1) - (hasHeader ? 1 : 0);
      if (idx >= 0 && idx < rowCount) {
        // Coded Theme (only if above threshold)
        if (!alloc.belowThreshold) {
          bValues[idx] = [alloc.theme.label];
        }
        // Best Fit always shows the top theme label
        cValues[idx] = [alloc.theme.label];
      }
    }
    const bTarget = outputSheet.getRange('B2').getResizedRange(rowCount - 1, 0);
    bTarget.values = bValues;
    const cTarget = outputSheet.getRange('C2').getResizedRange(rowCount - 1, 0);
    cTarget.values = cValues;
  }

  await applyTextColumnFormatting(outputSheet, context, 'A');
  // Adjust column widths: A 20% wider than base, B 4x base, C same as B
  try {
    const aCol = outputSheet.getRange('A:A');
    aCol.format.load('columnWidth');
    await context.sync();
    const base = Math.max(60, Number(aCol.format.columnWidth) || 320);
    aCol.format.columnWidth = Math.round(base * 1.2);
    const bCol = outputSheet.getRange('B:B');
    const cCol = outputSheet.getRange('C:C');
    // Previously set to base * 4; reduce to a quarter of that (i.e., base)
    bCol.format.columnWidth = Math.round(base);
    cCol.format.columnWidth = Math.round(base);
  } catch {
    // Ignore width errors on hosts that don't allow setting fixed widths
  }
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
