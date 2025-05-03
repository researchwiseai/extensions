import { API_BASE } from './config';
import { getOAuthService } from './getOAuthService';
import { saveThemeSet } from './saveThemeSet';

export function generateThemes() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Starting theme generation...', 'Pulse');
    const sheet = ss.getActiveSheet();
    const range = sheet.getActiveRange();
    const values = range.getValues();

    const inputs = [];
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const text = values[i][j];
            if (text != null && text !== '') {
                inputs.push(text.toString());
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert('No text found in selected cells to generate themes.');
        return;
    }

    const total = inputs.length;
    let usedInputs = inputs;
    let pct = 100;
    if (inputs.length > 1000) {
        // Randomly sample up to 1000 inputs
        usedInputs = inputs.slice();
        for (let i = usedInputs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = usedInputs[i];
            usedInputs[i] = usedInputs[j];
            usedInputs[j] = temp;
        }
        usedInputs = usedInputs.slice(0, 1000);
        pct = Math.round((usedInputs.length / total) * 100);
        ui.alert(
            'Sampling input: using ' +
                usedInputs.length +
                ' of ' +
                total +
                ' strings (' +
                pct +
                '%) for theme generation.',
        );
    }

    const url = `${API_BASE}/themes`;
    const options = {
        method: 'post' as const,
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + getOAuthService().getAccessToken(),
        },
        payload: JSON.stringify({ inputs: usedInputs }),
    };

    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert('Error calling themes API: ' + e.toString());
        return;
    }

    if (data.themes && Array.isArray(data.themes)) {
        writeResults(data.themes);
        // Save generated themes as a theme set named by timestamp
        try {
            const minimal = data.themes.map(function (t) {
                return {
                    label: t.label,
                    representatives: [
                        (t.representatives && t.representatives[0]) || '',
                        (t.representatives && t.representatives[1]) || '',
                    ],
                };
            });
            const timestamp = Utilities.formatDate(
                new Date(),
                Session.getScriptTimeZone(),
                'yyyy-MM-dd HH:mm:ss',
            );
            saveThemeSet(timestamp, minimal);
        } catch (e) {
            ui.alert(
                'Warning: failed to save generated theme set: ' + e.toString(),
            );
        }
        ss.toast('Theme generation complete', 'Pulse');
        return;
    }

    if (!data.jobId) {
        ui.alert(
            'Unexpected response from themes API: ' + JSON.stringify(data),
        );
        return;
    }

    const jobId = data.jobId;
    ss.toast('Theme job submitted, polling for completion...', 'Pulse');

    let resultUrl: string | undefined;
    let attempt = 0;
    while (true) {
        Utilities.sleep(2000);
        if (attempt % 5 === 0) {
            ss.toast('Waiting for theme job to complete...', 'Pulse');
        }
        attempt++;

        let jobData;
        try {
            const jobResp = UrlFetchApp.fetch(
                `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`,
                {
                    method: 'get',
                    headers: {
                        Authorization:
                            'Bearer ' + getOAuthService().getAccessToken(),
                    },
                },
            );
            jobData = JSON.parse(jobResp.getContentText());
        } catch (e) {
            ui.alert('Error checking theme job status: ' + e.toString());
            return;
        }
        if (jobData.status === 'pending') {
            continue;
        } else if (jobData.status === 'completed') {
            resultUrl = jobData.resultUrl;
            break;
        } else {
            ui.alert('Theme job failed: ' + (jobData.status || 'unknown'));
            return;
        }
    }

    let resultData;
    try {
        const resultResp = UrlFetchApp.fetch(resultUrl, {
            method: 'get',
        });
        resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
        ui.alert('Error fetching theme results: ' + e.toString());
        return;
    }

    if (!resultData.themes || !Array.isArray(resultData.themes)) {
        ui.alert(
            'Invalid theme results returned: ' + JSON.stringify(resultData),
        );
        return;
    }

    writeResults(resultData.themes);
    // Save generated themes as a theme set named by timestamp
    try {
        const minimal = resultData.themes.map(function (t) {
            return {
                label: t.label,
                representatives: [
                    (t.representatives && t.representatives[0]) || '',
                    (t.representatives && t.representatives[1]) || '',
                ],
            };
        });
        const timestamp = Utilities.formatDate(
            new Date(),
            Session.getScriptTimeZone(),
            'yyyy-MM-dd HH:mm:ss',
        );
        saveThemeSet(timestamp, minimal);
    } catch (e) {
        ui.alert(
            'Warning: failed to save generated theme set: ' + e.toString(),
        );
    }
    ss.toast('Theme generation complete', 'Pulse');

    function writeResults(themes) {
        let outputSheet = ss.getSheetByName('Themes');
        if (!outputSheet) {
            outputSheet = ss.insertSheet('Themes');
        } else {
            outputSheet.clear();
        }
        const headers = [
            'Short Label',
            'Label',
            'Description',
            'Representative 1',
            'Representative 2',
        ];
        outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        const rows = themes.map((theme) => [
            theme.shortLabel,
            theme.label,
            theme.description,
            theme.representatives[0] || '',
            theme.representatives[1] || '',
        ]);
        if (rows.length > 0) {
            outputSheet
                .getRange(2, 1, rows.length, headers.length)
                .setValues(rows);
        }
    }
}
