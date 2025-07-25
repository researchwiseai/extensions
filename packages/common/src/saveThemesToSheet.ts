import type { Theme } from './apiClient';
import { themesToRows } from './dataUtils';

export interface SaveThemesAdapter<SheetLike = any> {
    themes: Theme[];
    addSheet(name: string): SheetLike | Promise<SheetLike>;
    clearSheet(sheet: SheetLike): void | Promise<void>;
    write(sheet: SheetLike, range: string, values: string[][]): void | Promise<void>;
}

export async function saveThemesToSheet<SheetLike>(
    opts: SaveThemesAdapter<SheetLike>,
): Promise<SheetLike> {
    const { themes, addSheet, clearSheet, write } = opts;
    const sheet = await addSheet('Themes');
    await clearSheet(sheet);

    const headers = [
        'Label',
        'Short Label',
        'Description',
        'Representative 1',
        'Representative 2',
    ];
    await write(sheet, 'A1:E1', [headers]);

    const rows = themesToRows(themes);
    const end = rows.length + 1;
    const range = `A2:E${end}`;
    await write(sheet, range, rows);

    return sheet;
}
