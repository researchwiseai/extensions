import { extractInputs, Pos } from './input';

export interface ExtractOptions {
    rowOffset?: number;
    colOffset?: number;
    hasHeader?: boolean;
}

/**
 * Extract inputs from tabular data with optional header row.
 *
 * When `hasHeader` is true, the first row is treated as a header and omitted
 * from the returned inputs/positions. The header string is returned separately.
 */
export function extractInputsWithHeader(
    data: any[][],
    opts: ExtractOptions = {},
): { header?: string; inputs: string[]; positions: Pos[] } {
    const { rowOffset = 0, colOffset = 0, hasHeader = false } = opts;

    let header: string | undefined;
    let rows = data;
    let offset = rowOffset;
    if (hasHeader && data.length > 0) {
        header = data[0][0] != null ? String(data[0][0]) : '';
        rows = data.slice(1);
        offset = rowOffset + 1;
    }

    const { inputs, positions } = extractInputs(rows, {
        rowOffset: offset,
        colOffset,
    });

    return { header, inputs, positions };
}

/**
 * Expand sparse inputs to cover all rows between the first and last position.
 *
 * Blank strings are inserted for any missing rows so that the returned array
 * aligns with the original sheet rows.
 */
export function expandWithBlankRows(
    inputs: string[],
    positions: Pos[],
): string[] {
    if (inputs.length === 0) {
        return [];
    }
    const map = new Map<number, string>();
    positions.forEach((pos, i) => {
        map.set(pos.row, inputs[i]);
    });
    const rows = positions.map((p) => p.row);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);

    const result: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
        result.push(map.get(r) ?? '');
    }
    return result;
}

import type { Theme } from './apiClient';

/**
 * Convert an array of Theme objects to a 2D row representation.
 */
export function themesToRows(themes: Theme[], repCount = 10): string[][] {
    const clamped = Math.max(0, Math.min(10, repCount));
    return themes.map((t) => {
        const reps = (t.representatives ?? []).slice(0, clamped);
        const padded = reps.concat(Array(Math.max(0, clamped - reps.length)).fill(''));
        return [
            t.label ?? '',
            t.shortLabel ?? '',
            t.description ?? '',
            ...padded,
        ];
    });
}

/**
 * Convert rows from a sheet to Theme objects. Rows without a label are skipped.
 */
export function rowsToThemes(rows: string[][]): Theme[] {
    return rows
        .map((row) => {
            const reps = row
                .slice(3)
                .filter((r) => r != null && r !== '')
                .map((r) => String(r));
            return {
                label: String(row[0] ?? ''),
                shortLabel: String(row[1] ?? ''),
                description: String(row[2] ?? ''),
                representatives: reps,
            } as Theme;
        })
        .filter((t) => t.label !== '');
}
