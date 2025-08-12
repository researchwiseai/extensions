import type { Theme } from 'pulse-common';
import { saveThemesToSheet as saveCommon } from 'pulse-common/saveThemesToSheet';

interface Props {
    themes: Theme[];
    context: Excel.RequestContext;
}

export async function saveThemesToSheet({ context, themes }: Props) {
    let existed = true;
    await saveCommon({
        themes,
        async addSheet(name) {
            try {
                const sheet = context.workbook.worksheets.add(name);
                await context.sync();
                existed = false;
                return sheet;
            } catch (e) {
                const sheet = context.workbook.worksheets.getItem(name);
                return sheet;
            }
        },
        async clearSheet(sheet) {
            if (existed) {
                sheet.getUsedRange().clear();
                await context.sync();
            }
        },
        async write(sheet, range, values) {
            const r = sheet.getRange(range);
            r.values = values;
            r.format.autofitColumns();
            // Apply header formatting for any header row (row 1)
            if (/^A1:[A-Z]+1$/.test(range)) {
                r.format.fill.color = '#D9EAD3';
                r.format.font.bold = true;
                r.format.horizontalAlignment = Excel.HorizontalAlignment.center;
                r.format.borders.getItem('EdgeBottom').style =
                    Excel.BorderLineStyle.double;
            }
            await context.sync();
        },
    });
}
