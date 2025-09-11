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

        // Always start dictionary columns at absolute column B (index 1)
        const hasHeader = !!options.hasHeader;

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
        const dictStartCol = 1; // Column B

        if (hasHeader && resultLen > 0) {
            // Overwrite header starting at column B with the final dictionary
            const headerRange = sheet.getRangeByIndexes(
                headerRow,
                dictStartCol,
                1,
                Math.max(resultLen, 1),
            );
            headerRange.values = [resultLen > 0 ? resultDict : ['']];
        }

        // Build per-column arrays and write by matching actual header positions (if any)
        const toCellString = (arr: string[] | undefined) =>
            Array.isArray(arr) ? arr.join('; ') : '';
        const dataRowCount = hasHeader ? rowCount - 1 : rowCount;
        const firstDataRow = hasHeader ? used.rowIndex + 1 : used.rowIndex;

        // Columns are written in order starting at column B; no remapping to existing headers

        const writeRows = Math.min(inputs.length, result.results.length);
        for (let j = 0; j < resultLen; j++) {
            const colAbs = dictStartCol + j;

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
