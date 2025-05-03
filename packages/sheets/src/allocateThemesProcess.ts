import { API_BASE } from "./config";
import { getOAuthService } from "./getOAuthService";

/**
 * Calls the similarity endpoint to assign each input to the closest theme.
 */

export function allocateThemesProcess(inputs, positions, themes, sheet) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const setA = inputs;
    const setB = themes.map(
        (t) =>
            (t.representatives[0] || '') + ' ' + (t.representatives[1] || ''),
    );
    const url = `${API_BASE}/similarity`;
    const options = {
        method: 'post' as const,
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + getOAuthService().getAccessToken(),
        },
        // fast=false triggers async polling behavior
        payload: JSON.stringify({ set_a: setA, set_b: setB, fast: false }),
    };
    // Initial request to similarity endpoint (async with fast=false)
    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert('Error calling similarity API: ' + e.toString());
        return;
    }

    let matrix;
    // Synchronous response
    if (data.matrix || data.flattened) {
        matrix = data.matrix;
        if (!matrix && data.flattened) {
            const flat = data.flattened;
            const n = setA.length;
            const m = setB.length;
            matrix = [];
            for (let i = 0; i < n; i++) {
                matrix[i] = flat.slice(i * m, (i + 1) * m);
            }
        }
    }

    // Asynchronous job response
    else if (data.jobId) {
        const jobId = data.jobId;
        ss.toast(
            'Allocation job submitted, polling for completion...',
            'Pulse',
        );

        let resultUrl;
        let attempt = 0;
        while (true) {
            Utilities.sleep(2000);
            if (attempt % 5 === 0) {
                ss.toast('Waiting for allocation job to complete...', 'Pulse');
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
                    'Error checking similarity job status: ' + e.toString(),
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
                    'Similarity job failed: ' + (jobData.status || 'unknown'),
                );
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
            ui.alert('Error fetching similarity results: ' + e.toString());
            return;
        }
        if (!resultData.matrix && !resultData.flattened) {
            ui.alert(
                'Invalid similarity results returned: ' +
                    JSON.stringify(resultData),
            );
            return;
        }
        matrix = resultData.matrix;
        if (!matrix && resultData.flattened) {
            const flat = resultData.flattened;
            const n = setA.length;
            const m = setB.length;
            matrix = [];
            for (let i = 0; i < n; i++) {
                matrix[i] = flat.slice(i * m, (i + 1) * m);
            }
        }
    }

    // Unexpected response
    else {
        ui.alert('Unexpected similarity response: ' + JSON.stringify(data));
        return;
    }

    // Assign themes based on similarity matrix
    matrix.forEach((row, i) => {
        let maxSim = -Infinity;
        let bestIdx = 0;
        row.forEach((score, j) => {
            if (score > maxSim) {
                maxSim = score;
                bestIdx = j;
            }
        });
        const pos = positions[i];
        sheet.getRange(pos.row, pos.col + 1).setValue(themes[bestIdx].label);
    });
    ss.toast('Theme allocation complete', 'Pulse');
}
