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

export async function saveThemesToSheet<SheetLike>(
    opts: SaveThemesAdapter<SheetLike>,
): Promise<SheetLike> {
    const { themes, addSheet, clearSheet, write } = opts;
    const sheet = await addSheet('Themes');
    await clearSheet(sheet);

    const representativeHeaders = Array.from(
        { length: 10 },
        (_, i) => `Representative ${i + 1}`,
    );
    const headers = [
        'Label',
        'Short Label',
        'Description',
        ...representativeHeaders,
    ];
    await write(sheet, 'A1:M1', [headers]);

    const rows = themesToRows(themes);
    const end = rows.length + 1;
    const range = `A2:M${end}`;
    await write(sheet, range, rows);

    return sheet;
}
