import { API_BASE } from "./config";
import { getOAuthService } from "./getOAuthService";

/**
 * Analyze sentiment of selected text in the active sheet.
 * 
 * Called by FE
 * 
 * @param {string} dataRange A1 notation of the data range to analyze.
 */
export function analyzeSentiment() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Starting sentiment analysis...', 'Pulse');
    const sheet = ss.getActiveSheet();
    const range = sheet.getActiveRange();
    const values = range.getValues();

    const inputs = [];
    const positions = [];
    const startRow = range.getRow();
    const startCol = range.getColumn();
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const text = values[i][j];
            if (text != null && text !== '') {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert('No text found in selected cells to analyze.');
        return;
    }

    const url = `${API_BASE}/sentiment?fast=false`;
    const options = {
        method: 'post' as const,
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + getOAuthService().getAccessToken(),
        },
        payload: JSON.stringify({ inputs }),
    };

    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert('Error calling sentiment API: ' + e.toString());
        return;
    }

    if (data.results && Array.isArray(data.results)) {
        writeResults(data.results);
        ss.toast('Sentiment analysis complete', 'Pulse');
        return;
    }

    if (!data.jobId) {
        ui.alert(
            'Unexpected response from sentiment API: ' + JSON.stringify(data),
        );
        return;
    }

    const jobId = data.jobId;
    ss.toast('Sentiment job submitted, polling for completion...', 'Pulse');

    let resultUrl;
    let i = 0;
    while (true) {
        Utilities.sleep(2000);

        if (i % 5 === 0) {
            // Show toast every 5 seconds to say we are still waiting
            ss.toast('Waiting for sentiment job to complete...', 'Pulse');
        }

        i += 1;

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
            ui.alert('Error checking job status: ' + e.toString());
            return;
        }
        if (jobData.status === 'pending') {
            continue;
        } else if (jobData.status === 'completed') {
            resultUrl = jobData.resultUrl;
            break;
        } else {
            ui.alert('Sentiment job failed: ' + (jobData.status || 'unknown'));
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
        ui.alert('Error fetching sentiment results: ' + e.toString());
        return;
    }

    if (!resultData.results || !Array.isArray(resultData.results)) {
        ui.alert('Invalid results returned: ' + JSON.stringify(resultData));
        return;
    }

    writeResults(resultData.results);
    ss.toast('Sentiment analysis complete', 'Pulse');

    function writeResults(results) {
        results.forEach((res, idx) => {
            const pos = positions[idx];
            const sentiment = res.sentiment;
            sheet.getRange(pos.row, pos.col + 1).setValue(sentiment);
        });
    }
}
