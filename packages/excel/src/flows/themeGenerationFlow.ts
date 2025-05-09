import { generateThemes } from 'pulse-common/api';
import { saveThemeSet } from 'pulse-common/themes';

import { extractInputs } from 'pulse-common/input';
import { getAccessToken } from 'pulse-common/auth';

export async function themeGenerationFlow(
    context: Excel.RequestContext,
    range: string,
) {
    const parts = range.split('!');
    const sheetName = parts[0];
    const rangeNotation = parts.slice(1).join('!');
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const target = sheet.getRange(rangeNotation);
    target.load(['values', 'rowIndex', 'columnIndex']);

    await context.sync();

    const values = target.values;
    const { inputs, positions } = extractInputs(values, {
        rowOffset: target.rowIndex + 1,
        colOffset: target.columnIndex + 1,
    });

    if (inputs.length === 0) {
        console.warn(
            'No text found in selected data range for theme generation.',
        );
        return;
    }

    const accessToken = await getAccessToken();
    debugger;

    const result = await generateThemes(inputs, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    // Write themes to new/existing sheet called "Themes"
    // Upsert the themes, removing existing ones
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

    const themes = result.themes.map((theme) => [
        theme.label,
        theme.shortLabel,
        theme.description,
        theme.representatives[0],
        theme.representatives[1],
    ]);
    console.log('Range', `A2:E${themes.length + 1}`);
    console.log('Themes', themes);
    themesSheet.getRange(`A2:E${themes.length + 1}`).values = themes;
    themesSheet.getRange(`A2:E${themes.length + 1}`).format.autofitColumns();

    await context.sync();

    await saveThemeSet(
        new Date(Date.now()).toISOString().slice(0, 19),
        result.themes,
    );

    return { inputs, positions, sheet, themes: result.themes }; // Return the inputs and positions for further processing
    // by other flows
}
