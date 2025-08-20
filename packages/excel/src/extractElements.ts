import { extractElements as extractElementsApi } from 'pulse-common/api';

export async function extractElementsFromActiveWorksheet(
    category: string,
    expandDictionary: boolean,
) {
    const startTime = Date.now();

    await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const used = sheet.getUsedRange();
        used.load(['values', 'rowCount', 'columnCount', 'rowIndex', 'columnIndex', 'address']);
        await context.sync();

        const values: any[][] = used.values as any[][];
        const rowCount = used.rowCount;
        const colCount = used.columnCount;

        if (!values || rowCount < 2 || colCount < 2) {
            throw new Error(
                'Worksheet must have texts in column A and dictionary terms in row 1 starting at B1.',
            );
        }

        // Dictionary: row 1, from B1 across
        const rawHeader = values[0];
        const dictionary: string[] = [];
        let firstDictOffset = -1;
        for (let c = 1; c < colCount; c++) {
            const term = String(rawHeader[c] ?? '').trim();
            if (term) {
                if (firstDictOffset === -1) firstDictOffset = c;
                dictionary.push(term);
            }
        }
        if (dictionary.length === 0) {
            throw new Error('No dictionary terms found in row 1 (from B1 across).');
        }
        if (firstDictOffset === -1) firstDictOffset = 1;

        // Inputs: column A, from row 2 down; collect mapping to sheet rows for non-empty values
        const inputs: string[] = [];
        const inputRowMap: number[] = [];
        for (let r = 1; r < rowCount; r++) {
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

        // Respect the endpoint limits: up to 200 inputs
        const limitedInputs = inputs.slice(0, 200);

        const result = await extractElementsApi(limitedInputs, {
            category,
            dictionary,
            expandDictionary,
            fast: false,
            onProgress: (m) => console.log(m),
        });

        // Direct-to-sheet writeback:
        // 1) Update/extend headers in row 1 from B1 across to match returned dictionary
        const resultDict = result.dictionary || [];
        const resultLen = resultDict.length;

        if (resultLen > 0) {
            // If returned dictionary starts with original header terms, append only the extras,
            // otherwise overwrite the entire header row to match the returned order.
            const isPrefix = dictionary.every(
                (t, i) => resultDict[i] !== undefined && resultDict[i] === t,
            );

            const headerRow = used.rowIndex;
            const dictStartCol = used.columnIndex + firstDictOffset; // first non-empty header after column A
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
                headerRange.values = [
                    resultLen > 0 ? resultDict : [''],
                ];
            }

            // 2) Build per-column arrays and write by matching actual header positions
            const dataRowCount = rowCount - 1; // excludes header row
            const toCellString = (arr: string[] | undefined) =>
                Array.isArray(arr) ? arr.join('; ') : '';

            const firstDataRow = used.rowIndex + 1;

            // Re-read header cells starting from actual dictionary start to find exact positions
            const headerScanWidth = Math.max(resultLen + 4, colCount);
            const headerScan = sheet.getRangeByIndexes(
                headerRow,
                dictStartCol,
                1,
                headerScanWidth,
            );
            headerScan.load('values');
            await context.sync();

            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const headerVals: string[] = (headerScan.values?.[0] ?? []).map((v) =>
                (v == null ? '' : String(v)).trim(),
            );
            const idxMap = new Map<string, number>();
            headerVals.forEach((label, idx) => {
                if (!label) return;
                const colAbs = dictStartCol + idx;
                idxMap.set(normalize(label), colAbs);
            });

            const writeRows = Math.min(limitedInputs.length, result.results.length);
            for (let j = 0; j < resultLen; j++) {
                const headerLabel = String(resultDict[j] ?? '').trim();
                const colAbs = idxMap.get(normalize(headerLabel)) ?? dictStartCol + j;

                // Build this column's values
                const colValues: string[][] = Array.from(
                    { length: dataRowCount },
                    () => [''],
                );
                for (let i = 0; i < writeRows; i++) {
                    const usedRelRow = inputRowMap[i];
                    const gridRow = usedRelRow - 1; // 0-based index into data rows
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
        }
    });
}
