import { allocateThemesProcess } from './allocateThemesProcess';
import { API_BASE } from './config';
import { getOAuthService } from './getOAuthService';
import { saveThemeSet } from "./saveThemeSet";

/**
 * Automatically generate themes, save as a named set, then allocate to data.
 * 
 * Called by FE
 * 
 * @param {string} dataRange A1 notation of the data range to allocate.
 * @param {string} name Name for the new theme set.
 */
export function allocateAndSaveThemeSet(dataRange: string, name: string) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dataRangeObj: GoogleAppsScript.Spreadsheet.Range;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert('Error reading data range: ' + e.toString());
        return;
    }
    const dataSheet = dataRangeObj.getSheet();
    const values = dataRangeObj.getValues();
    const inputs = [];
    const positions = [];
    const startRow = dataRangeObj.getRow();
    const startCol = dataRangeObj.getColumn();
    for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[0].length; j++) {
            const text = values[i][j];
            if (text != null && text !== '') {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert('No text found in selected data range for theme allocation.');
        return;
    }
    // Sample inputs if needed
    const total = inputs.length;
    let usedInputs = inputs;
    let pct = 100;
    if (inputs.length > 1000) {
        usedInputs = inputs.slice();
        for (let i = usedInputs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [usedInputs[i], usedInputs[j]] = [usedInputs[j], usedInputs[i]];
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
    // Call themes API
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
    let themesData;
    if (data.themes && Array.isArray(data.themes)) {
        themesData = data.themes;
    } else if (data.jobId) {
        const jobId = data.jobId;
        ss.toast(
            'Theme generation job submitted, polling for completion...',
            'Pulse',
        );
        let resultUrl;
        let attempt = 0;
        while (true) {
            Utilities.sleep(2000);
            if (attempt % 5 === 0) {
                ss.toast(
                    'Waiting for theme generation job to complete...',
                    'Pulse',
                );
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
                ui.alert(
                    'Error checking theme generation job status: ' +
                        e.toString(),
                );
                return;
            }
            if (jobData.status === 'pending') {
                continue;
            } else if (jobData.status === 'completed') {
                resultUrl = jobData.resultUrl;
                break;
            } else {
                ui.alert(
                    'Theme generation job failed: ' +
                        (jobData.status || 'unknown'),
                );
                return;
            }
        }
        let resultData;
        try {
            const resultResp = UrlFetchApp.fetch(resultUrl, {
                method: 'get',
                headers: {
                    Authorization:
                        'Bearer ' + getOAuthService().getAccessToken(),
                },
            });
            resultData = JSON.parse(resultResp.getContentText());
        } catch (e) {
            ui.alert(
                'Error fetching theme generation results: ' + e.toString(),
            );
            return;
        }
        if (!resultData.themes || !Array.isArray(resultData.themes)) {
            ui.alert(
                'Invalid theme generation results returned: ' +
                    JSON.stringify(resultData),
            );
            return;
        }
        themesData = resultData.themes;
    } else {
        ui.alert(
            'Unexpected response from themes API: ' + JSON.stringify(data),
        );
        return;
    }
    // Build minimal themes for saving and allocation
    const themes = themesData.map(function (t) {
        return {
            label: t.label,
            representatives: [
                (t.representatives && t.representatives[0]) || '',
                (t.representatives && t.representatives[1]) || '',
            ],
        };
    });
    // Save the new theme set
    saveThemeSet(name, themes);
    // Allocate themes to data
    allocateThemesProcess(inputs, positions, themes, dataSheet);
}
