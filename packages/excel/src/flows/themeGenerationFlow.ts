import { generateThemes } from 'pulse-common/api';
import { saveThemeSet } from 'pulse-common/themes';

import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { maybeActivateSheet } from '../services/maybeActivateSheet';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function themeGenerationFlow(
    context: Excel.RequestContext,
    range: string,
    hasHeader = false,
    startTime?: number,
) {
    const start = startTime ?? Date.now();
    const {
        sheet,
        inputs: rawInputs,
        positions: rawPositions,
        rangeInfo,
    } = await getSheetInputsAndPositions(context, range);

    let header: string | undefined;
    let inputs = rawInputs;
    let positions = rawPositions;
    if (hasHeader) {
        // Read header cell and exclude it from inputs
        const headerCell = sheet.getRangeByIndexes(
            rangeInfo.rowIndex,
            rangeInfo.columnIndex,
            1,
            1,
        );
        headerCell.load('values');
        await context.sync();
        header = String(headerCell.values[0][0] ?? '');
        inputs = rawInputs.slice(1);
        positions = rawPositions.slice(1);
    }

    const result = await generateThemes(inputs, {
        fast: false,
        context: hasHeader
            ? `The inputs provided are from a column of data in Excel. The column header is: ${header}`
            : undefined,
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

    if (startTime !== undefined) {
        await maybeActivateSheet(context, themesSheet, start);

        const feed = getFeed();
        const last = feed[feed.length - 1];
        if (last) {
            updateItem({
                jobId: last.jobId,
                onClick: () => {
                    Excel.run(async (context) => {
                        context.workbook.worksheets
                            .getItem(themesSheetName)
                            .activate();
                        await context.sync();
                    });
                },
            });
        }
    }

    return {
        inputs,
        positions,
        sheet,
        themes: result.themes,
        rangeInfo,
        header,
    }; // Return the inputs and positions (and header) for further processing
    // by other flows
}
