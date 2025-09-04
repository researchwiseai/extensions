import type { Theme } from './apiClient';
import { themesToRows } from './dataUtils';

export interface SaveThemesAdapter<SheetLike = any> {
    themes: Theme[];
    addSheet(name: string): SheetLike | Promise<SheetLike>;
    clearSheet(sheet: SheetLike): void | Promise<void>;
    write(
        sheet: SheetLike,
        range: string,
        values: string[][],
    ): void | Promise<void>;
}

function colLetterFromIndex(index: number): string {
    // index is 1-based column number
    let n = index;
    let s = '';
    while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

export async function saveThemesToSheet<SheetLike>(
    opts: SaveThemesAdapter<SheetLike>,
): Promise<SheetLike> {
    const { themes, addSheet, clearSheet, write } = opts;
    const sheet = await addSheet('Themes');
    await clearSheet(sheet);

    // Be defensive: callers might pass undefined at runtime. Treat as empty.
    const themesArr = (themes ?? []) as Theme[];

    const maxReps = Math.min(
        10,
        Math.max(0, ...themesArr.map((t) => (t.representatives?.length ?? 0))),
    );
    const representativeHeaders = Array.from(
        { length: maxReps },
        (_, i) => `Representative ${i + 1}`,
    );
    const headers = [
        'Label',
        'Short Label',
        'Description',
        ...representativeHeaders,
    ];
    const lastCol = colLetterFromIndex(3 + maxReps);
    await write(sheet, `A1:${lastCol}1`, [headers]);

    const rows = themesToRows(themesArr, maxReps);
    if (rows.length > 0) {
        const end = rows.length + 1;
        const range = `A2:${lastCol}${end}`;
        await write(sheet, range, rows);
    }

    return sheet;
}
