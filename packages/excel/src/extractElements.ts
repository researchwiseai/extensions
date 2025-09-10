import { extractElements as extractElementsApi } from 'pulse-common/api';

export async function extractElementsFromWorksheet(options: {
    sheetName: string | null;
    hasHeader: boolean;
    dictionary: string[];
    expandDictionary: boolean;
}) {
    await Excel.run(async (context) => {
        const sheet = options.sheetName
            ? context.workbook.worksheets.getItem(options.sheetName)
            : context.workbook.worksheets.getActiveWorksheet();
        const used = sheet.getUsedRange();
        used.load([
            'values',
            'rowCount',
            'columnCount',
            'rowIndex',
            'columnIndex',
            'address',
        ]);
        await context.sync();

        const values: any[][] = used.values as any[][];
        const rowCount = used.rowCount;
        const colCount = used.columnCount;
        if (!values || rowCount < 1 || colCount < 1) {
            throw new Error('Worksheet appears to be empty.');
        }

        // Determine where dictionary columns should start
        let firstDictOffset = 1; // default to column B
        const hasHeader = !!options.hasHeader;
        if (hasHeader && colCount >= 2) {
            const rawHeader = values[0];
            for (let c = 1; c < colCount; c++) {
                const term = String(rawHeader[c] ?? '').trim();
                if (term) {
                    firstDictOffset = c;
                    break;
                }
            }
        }

        // Inputs: column A, from row 2 if header, else row 1
        const startRow = hasHeader ? 1 : 0;
        const inputs: string[] = [];
        const inputRowMap: number[] = [];
        for (let r = startRow; r < rowCount; r++) {
            const cell = values[r][0];
            const text = (cell == null ? '' : String(cell)).trim();
            if (text) {
                inputs.push(text);
                inputRowMap.push(r); // sheet row index in zero-based usedRange values
            }
        }
        if (inputs.length === 0) {
            throw new Error('No input texts found in column A.');
        }

        const dictionary = Array.from(
            new Set((options.dictionary || []).map((s) => String(s).trim()).filter(Boolean)),
        );

        const result = await extractElementsApi(inputs, {
            // Category now deprecated; pass a generic placeholder to maintain compatibility
            category: 'entity',
            dictionary,
            expandDictionary: options.expandDictionary,
            fast: false,
            onProgress: (m) => console.log(m),
        });

        // Direct-to-sheet writeback
        const resultDict = result.dictionary || [];
        const resultLen = resultDict.length;
        const headerRow = used.rowIndex;
        const dictStartCol = used.columnIndex + firstDictOffset;

        if (hasHeader && resultLen > 0) {
            // Update/extend headers to match returned dictionary
            const isPrefix = dictionary.every(
                (t, i) => resultDict[i] !== undefined && resultDict[i] === t,
            );
            if (isPrefix && resultLen > dictionary.length) {
                const appendCount = resultLen - dictionary.length;
                const headerRange = sheet.getRangeByIndexes(
                    headerRow,
                    dictStartCol + dictionary.length,
                    1,
                    appendCount,
                );
                headerRange.values = [resultDict.slice(dictionary.length)];
            } else {
                const headerRange = sheet.getRangeByIndexes(
                    headerRow,
                    dictStartCol,
                    1,
                    Math.max(resultLen, 1),
                );
                headerRange.values = [resultLen > 0 ? resultDict : ['']];
            }
        }

        // Build per-column arrays and write by matching actual header positions (if any)
        const toCellString = (arr: string[] | undefined) =>
            Array.isArray(arr) ? arr.join('; ') : '';
        const dataRowCount = hasHeader ? rowCount - 1 : rowCount;
        const firstDataRow = hasHeader ? used.rowIndex + 1 : used.rowIndex;

        let idxMap: Map<string, number> | null = null;
        if (hasHeader) {
            const headerScanWidth = Math.max(resultLen + 4, colCount);
            const headerScan = sheet.getRangeByIndexes(
                headerRow,
                dictStartCol,
                1,
                headerScanWidth,
            );
            headerScan.load('values');
            await context.sync();
            const normalize = (s: string) =>
                s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const headerVals: string[] = (headerScan.values?.[0] ?? []).map(
                (v) => (v == null ? '' : String(v)).trim(),
            );
            idxMap = new Map<string, number>();
            headerVals.forEach((label, idx) => {
                if (!label) return;
                const colAbs = dictStartCol + idx;
                (idxMap as Map<string, number>).set(normalize(label), colAbs);
            });
        }

        const writeRows = Math.min(inputs.length, result.results.length);
        for (let j = 0; j < resultLen; j++) {
            const headerLabel = String(resultDict[j] ?? '').trim();
            const colAbs = hasHeader && idxMap
                ? idxMap.get(headerLabel.toLowerCase().replace(/[^a-z0-9]/g, '')) ?? (dictStartCol + j)
                : dictStartCol + j;

            const colValues: string[][] = Array.from({ length: dataRowCount }, () => ['']);
            for (let i = 0; i < writeRows; i++) {
                const usedRelRow = inputRowMap[i];
                const gridRow = usedRelRow - (hasHeader ? 1 : 0);
                const rowRes = result.results[i] ?? [];
                const matches = rowRes[j] as string[] | undefined;
                colValues[gridRow][0] = toCellString(matches);
            }

            const colRange = sheet.getRangeByIndexes(
                firstDataRow,
                colAbs,
                Math.max(dataRowCount, 0),
                1,
            );
            colRange.values = colValues.length > 0 ? colValues : [['']];
        }
    });
}
