import { ShortTheme, Theme } from 'pulse-common';
import { readThemesFromSheet } from '../../services/readThemesFromSheet';

export async function getThemesFromSheet(
    context: Excel.RequestContext,
    sheetName: string,
): Promise<Theme[] | ShortTheme[]> {
    const worksheets = context.workbook.worksheets;
    worksheets.load('items/name');
    await context.sync();

    const sheetNames = worksheets.items.map((sheet) => sheet.name);

    if (!sheetNames.includes(sheetName)) {
        throw new Error(
            `Sheet with name "${sheetName}" not found. Available sheets: ${sheetNames.join(
                ', ',
            )}`,
        );
    }

    return await readThemesFromSheet(sheetName);
}
