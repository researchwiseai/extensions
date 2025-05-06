import type { Theme } from 'pulse-common';

interface Props {
    themes: Theme[];
    context: Excel.RequestContext;
}

export async function saveThemesToSheet({ context, themes }: Props) {
    const themesSheetName = 'Themes';
    let themesSheet;
    try {
        console.log('Creating new themes sheet');
        themesSheet = context.workbook.worksheets.add(themesSheetName);
        await context.sync();
    } catch (e) {
        themesSheet = context.workbook.worksheets.getItem(themesSheetName);
        console.log('Themes sheet already exists');
        themesSheet.getUsedRange().clear();
        await context.sync();
        console.log('Cleared existing themes sheet');
    }
    console.log('Themes sheet', themesSheet);
    themesSheet.getRange('A1:E1').values = [
        [
            'Label',
            'Short Label',
            'Description',
            'Representative 1',
            'Representative 2',
        ],
    ];
    themesSheet.getRange('A1:E1').format.autofitColumns();
    themesSheet.getRange('A1:E1').format.fill.color = '#D9EAD3';
    themesSheet.getRange('A1:E1').format.font.bold = true;
    themesSheet.getRange('A1:E1').format.horizontalAlignment =
        Excel.HorizontalAlignment.center;

    themesSheet.getRange('A1:E1').format.borders.getItem('EdgeBottom').style =
        Excel.BorderLineStyle.double;

    await context.sync();

    const themesArr = themes.map((theme) => [
        theme.label,
        theme.shortLabel,
        theme.description,
        theme.representatives[0],
        theme.representatives[1],
    ]);
    console.log('Range', `A2:E${themesArr.length + 1}`);
    themesSheet.getRange(`A2:E${themesArr.length + 1}`).values = themesArr;
    themesSheet.getRange(`A2:E${themesArr.length + 1}`).format.autofitColumns();

    await context.sync();
}
