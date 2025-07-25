import { generateThemes } from 'pulse-common/api';
import { extractInputsWithHeader } from 'pulse-common/dataUtils';
import { sampleInputs } from 'pulse-common/input';
import { saveThemeSet } from 'pulse-common/themes';
import { writeThemes } from './writeThemes';
import { feedToast } from './feedToast';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function generateThemesFlow(
    dataRange: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startTime = Date.now();
    feedToast('Starting theme generation...');

    let dataRangeObj: GoogleAppsScript.Spreadsheet.Range;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert('Error reading data range: ' + e.toString());
        return;
    }
    const values = dataRangeObj.getValues();

    const { header, inputs, positions } = extractInputsWithHeader(values, {
        rowOffset: dataRangeObj.getRow(),
        colOffset: dataRangeObj.getColumn(),
        hasHeader,
    });

    console.log('inputs', inputs);
    console.log('positions', positions);

    if (inputs.length === 0) {
        ui.alert('No text found in selected data range for theme allocation.');
        return;
    }
    // Sample inputs if needed
    const total = inputs.length;
    let usedInputs = inputs;

    if (inputs.length > 1000) {
        usedInputs = sampleInputs(inputs, 1000);

        ui.alert(
            'Sampling input: using ' +
                usedInputs.length +
                ' of ' +
                total +
                ' strings (' +
                Math.round((usedInputs.length / total) * 100) +
                '%) for theme generation.',
        );
    }
    console.log('usedInputs', usedInputs);
    const themesResponse = await generateThemes(usedInputs, {
        fast: false,
        context: hasHeader && header
            ? `The column header is: ${header}`
            : undefined,
        onProgress: (message) => {
            feedToast(message);
        },
    });

    const timestamp = Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        'yyyy-MM-dd HH:mm:ss',
    );
    saveThemeSet(timestamp, themesResponse.themes);
    const sheet = await writeThemes(themesResponse.themes, startTime);

    feedToast('Theme generation complete');

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                SpreadsheetApp.setActiveSheet(sheet);
            },
            sheetName: sheet.getName(),
        });
    }

    return {
        themes: themesResponse.themes,
        sampledInputs: usedInputs,
        inputs,
        positions,
        dataRangeObj,
        header,
    };
}

// export function generateThemes() {
//     const ui = SpreadsheetApp.getUi();
//     const ss = SpreadsheetApp.getActiveSpreadsheet();
//     ss.toast('Starting theme generation...', 'Pulse');
//     const sheet = ss.getActiveSheet();
//     const range = sheet.getActiveRange();
//     const values = range.getValues();

//     const inputs = [];
//     const numRows = range.getNumRows();
//     const numCols = range.getNumColumns();
//     for (let i = 0; i < numRows; i++) {
//         for (let j = 0; j < numCols; j++) {
//             const text = values[i][j];
//             if (text != null && text !== '') {
//                 inputs.push(text.toString());
//             }
//         }
//     }
//     if (inputs.length === 0) {
//         ui.alert('No text found in selected cells to generate themes.');
//         return;
//     }

//     const total = inputs.length;
//     let usedInputs = inputs;
//     let pct = 100;
//     if (inputs.length > 1000) {
//         // Randomly sample up to 1000 inputs
//         usedInputs = inputs.slice();
//         for (let i = usedInputs.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             const temp = usedInputs[i];
//             usedInputs[i] = usedInputs[j];
//             usedInputs[j] = temp;
//         }
//         usedInputs = usedInputs.slice(0, 1000);
//         pct = Math.round((usedInputs.length / total) * 100);
//         ui.alert(
//             'Sampling input: using ' +
//                 usedInputs.length +
//                 ' of ' +
//                 total +
//                 ' strings (' +
//                 pct +
//                 '%) for theme generation.',
//         );
//     }

