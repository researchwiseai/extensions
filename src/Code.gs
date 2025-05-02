// Script properties for API and authentication configuration
const SCRIPT_PROPS = PropertiesService.getScriptProperties();
// Base URL for API endpoints (from script property), e.g. "https://dev.core.researchwiseai.com"
const API_BASE = SCRIPT_PROPS.getProperty("API_BASE") + "/pulse/v1";
// API key (for legacy endpoints), if in use
const API_KEY = SCRIPT_PROPS.getProperty("API_KEY") || "YOUR_API_KEY_HERE";
// Web base URL (used for organization registration link), e.g. "https://dev.researchwiseai.com"
const WEB_BASE = SCRIPT_PROPS.getProperty("WEB_BASE");
// OAuth2 domain, e.g. "wise-dev.eu.auth0.com"
const AUTH_DOMAIN = SCRIPT_PROPS.getProperty("AUTH_DOMAIN");
// OAuth2 audience (API identifier), e.g. Auth0 API_AUD
const API_AUD = SCRIPT_PROPS.getProperty("API_AUD");
// Organization lookup endpoint (lookup by email via unauthenticated POST to /users)
const ORG_LOOKUP_URL = `${WEB_BASE}/users`;
// OAuth2 for Apps Script integration (requires adding the OAuth2 library in appsscript.json)

/**
 * Runs when the add-on is opened or installed: builds menu based on login state.
 */
function onOpen(e) {
    const ui = SpreadsheetApp.getUi();
    const pulseMenu = ui.createMenu("Pulse");
    // If user is authorized, expose analysis and themes
    if (getOAuthService().hasAccess()) {
        pulseMenu.addItem("Analyze Sentiment", "analyzeSentiment");
        const themesMenu = ui.createMenu("Themes")
            .addItem("Generate", "generateThemes")
            .addItem("Allocate", "allocateThemes")
            .addItem("Manage", "showManageThemesDialog");
        pulseMenu.addSubMenu(themesMenu);
        pulseMenu.addSeparator();
    }
    // Always include settings
    pulseMenu.addItem("Settings", "showSettingsSidebar");
    pulseMenu.addToUi();
}
/**
 * Automatically generate themes, save as a named set, then allocate to data.
 * @param {string} dataRange A1 notation of the data range to allocate.
 * @param {string} name Name for the new theme set.
 */
function allocateAndSaveThemeSet(dataRange, name) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dataRangeObj;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert("Error reading data range: " + e.toString());
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
            if (text != null && text !== "") {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert("No text found in selected data range for theme allocation.");
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
            "Sampling input: using " +
                usedInputs.length +
                " of " +
                total +
                " strings (" +
                pct +
                "%) for theme generation."
        );
    }
    // Call themes API
    const url = `${API_BASE}/themes`;
    const options = {
        method: "post",
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getOAuthService().getAccessToken()
        },
        payload: JSON.stringify({ inputs: usedInputs }),
    };
    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert("Error calling themes API: " + e.toString());
        return;
    }
    let themesData;
    if (data.themes && Array.isArray(data.themes)) {
        themesData = data.themes;
    } else if (data.jobId) {
        const jobId = data.jobId;
        ss.toast(
            "Theme generation job submitted, polling for completion...",
            "Pulse"
        );
        let resultUrl;
        let attempt = 0;
        while (true) {
            Utilities.sleep(2000);
            if (attempt % 5 === 0) {
                ss.toast(
                    "Waiting for theme generation job to complete...",
                    "Pulse"
                );
            }
            attempt++;
            let jobData;
            try {
                const jobResp = UrlFetchApp.fetch(
                    `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`,
                    {
                        method: "get",
                        headers: {
                            "Authorization": "Bearer " + getOAuthService().getAccessToken()
                        }
                    }
                );
                jobData = JSON.parse(jobResp.getContentText());
            } catch (e) {
                ui.alert(
                    "Error checking theme generation job status: " +
                        e.toString()
                );
                return;
            }
            if (jobData.status === "pending") {
                continue;
            } else if (jobData.status === "completed") {
                resultUrl = jobData.resultUrl;
                break;
            } else {
                ui.alert(
                    "Theme generation job failed: " +
                        (jobData.status || "unknown")
                );
                return;
            }
        }
        let resultData;
        try {
            const resultResp = UrlFetchApp.fetch(resultUrl, {
                method: "get",
                headers: {
                    "Authorization": "Bearer " + getOAuthService().getAccessToken()
                }
            });
            resultData = JSON.parse(resultResp.getContentText());
        } catch (e) {
            ui.alert(
                "Error fetching theme generation results: " + e.toString()
            );
            return;
        }
        if (!resultData.themes || !Array.isArray(resultData.themes)) {
            ui.alert(
                "Invalid theme generation results returned: " +
                    JSON.stringify(resultData)
            );
            return;
        }
        themesData = resultData.themes;
    } else {
        ui.alert(
            "Unexpected response from themes API: " + JSON.stringify(data)
        );
        return;
    }
    // Build minimal themes for saving and allocation
    const themes = themesData.map(function (t) {
        return {
            label: t.label,
            representatives: [
                (t.representatives && t.representatives[0]) || "",
                (t.representatives && t.representatives[1]) || "",
            ],
        };
    });
    // Save the new theme set
    saveThemeSet(name, themes);
    // Allocate themes to data
    allocateThemesProcess(inputs, positions, themes, dataSheet);
}
/**
 * Allocate themes from an existing saved set.
 * @param {string} dataRange A1 notation of the data range.
 * @param {string} name Name of the saved theme set.
 */
function allocateThemesFromSet(dataRange, name) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dataRangeObj;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert("Error reading data range: " + e.toString());
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
            if (text != null && text !== "") {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert("No text found in selected data range for theme allocation.");
        return;
    }
    const setObj = getThemeSets().find(function (s) {
        return s.name === name;
    });
    if (!setObj) {
        ui.alert("Theme set not found: " + name);
        return;
    }
    const themes = setObj.themes;
    allocateThemesProcess(inputs, positions, themes, dataSheet);
}
function analyzeSentiment() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Starting sentiment analysis...", "Pulse");
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
            if (text != null && text !== "") {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert("No text found in selected cells to analyze.");
        return;
    }

    const url = `${API_BASE}/sentiment?fast=false`;
    const options = {
        method: "post",
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getOAuthService().getAccessToken()
        },
        payload: JSON.stringify({ inputs }),
    };

    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert("Error calling sentiment API: " + e.toString());
        return;
    }

    if (data.results && Array.isArray(data.results)) {
        writeResults(data.results);
        ss.toast("Sentiment analysis complete", "Pulse");
        return;
    }

    if (!data.jobId) {
        ui.alert(
            "Unexpected response from sentiment API: " + JSON.stringify(data)
        );
        return;
    }

    const jobId = data.jobId;
    ss.toast("Sentiment job submitted, polling for completion...", "Pulse");

    let resultUrl;
    let i = 0;
    while (true) {
        Utilities.sleep(2000);

        if (i % 5 === 0) {
            // Show toast every 5 seconds to say we are still waiting
            ss.toast("Waiting for sentiment job to complete...", "Pulse");
        }

        i += 1;

        let jobData;
        try {
            const jobResp = UrlFetchApp.fetch(
                `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`,
                {
                    method: "get",
                    headers: {
                        "Authorization": "Bearer " + getOAuthService().getAccessToken()
                    }
                }
            );
            jobData = JSON.parse(jobResp.getContentText());
        } catch (e) {
            ui.alert("Error checking job status: " + e.toString());
            return;
        }
        if (jobData.status === "pending") {
            continue;
        } else if (jobData.status === "completed") {
            resultUrl = jobData.resultUrl;
            break;
        } else {
            ui.alert("Sentiment job failed: " + (jobData.status || "unknown"));
            return;
        }
    }

    let resultData;
    try {
        const resultResp = UrlFetchApp.fetch(resultUrl, {
            method: "get",
        });
        resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
        ui.alert("Error fetching sentiment results: " + e.toString());
        return;
    }

    if (!resultData.results || !Array.isArray(resultData.results)) {
        ui.alert("Invalid results returned: " + JSON.stringify(resultData));
        return;
    }

    writeResults(resultData.results);
    ss.toast("Sentiment analysis complete", "Pulse");

    function writeResults(results) {
        results.forEach((res, idx) => {
            const pos = positions[idx];
            const sentiment = res.sentiment;
            sheet.getRange(pos.row, pos.col + 1).setValue(sentiment);
        });
    }
}

function generateThemes() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Starting theme generation...", "Pulse");
    const sheet = ss.getActiveSheet();
    const range = sheet.getActiveRange();
    const values = range.getValues();

    const inputs = [];
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const text = values[i][j];
            if (text != null && text !== "") {
                inputs.push(text.toString());
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert("No text found in selected cells to generate themes.");
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
            "Sampling input: using " +
                usedInputs.length +
                " of " +
                total +
                " strings (" +
                pct +
                "%) for theme generation."
        );
    }

    const url = `${API_BASE}/themes`;
    const options = {
        method: "post",
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getOAuthService().getAccessToken()
        },
        payload: JSON.stringify({ inputs: usedInputs }),
    };

    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert("Error calling themes API: " + e.toString());
        return;
    }

    if (data.themes && Array.isArray(data.themes)) {
        writeResults(data.themes);
        // Save generated themes as a theme set named by timestamp
        try {
            const minimal = data.themes.map(function(t) {
                return {
                    label: t.label,
                    representatives: [
                        (t.representatives && t.representatives[0]) || "",
                        (t.representatives && t.representatives[1]) || ""
                    ]
                };
            });
            const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
            saveThemeSet(timestamp, minimal);
        } catch (e) {
            ui.alert('Warning: failed to save generated theme set: ' + e.toString());
        }
        ss.toast("Theme generation complete", "Pulse");
        return;
    }

    if (!data.jobId) {
        ui.alert(
            "Unexpected response from themes API: " + JSON.stringify(data)
        );
        return;
    }

    const jobId = data.jobId;
    ss.toast("Theme job submitted, polling for completion...", "Pulse");

    let resultUrl;
    let attempt = 0;
    while (true) {
        Utilities.sleep(2000);
        if (attempt % 5 === 0) {
            ss.toast("Waiting for theme job to complete...", "Pulse");
        }
        attempt++;

        let jobData;
        try {
            const jobResp = UrlFetchApp.fetch(
                `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`,
                {
                    method: "get",
                    headers: {
                        "X-API-Key": API_KEY,
                        "Authorization": "Bearer " + getOAuthService().getAccessToken()
                    },
                }
            );
            jobData = JSON.parse(jobResp.getContentText());
        } catch (e) {
            ui.alert("Error checking theme job status: " + e.toString());
            return;
        }
        if (jobData.status === "pending") {
            continue;
        } else if (jobData.status === "completed") {
            resultUrl = jobData.resultUrl;
            break;
        } else {
            ui.alert("Theme job failed: " + (jobData.status || "unknown"));
            return;
        }
    }

    let resultData;
    try {
        const resultResp = UrlFetchApp.fetch(resultUrl, {
            method: "get",
            headers: {
                "X-API-Key": API_KEY,
                "Authorization": "Bearer " + getOAuthService().getAccessToken()
            },
        });
        resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
        ui.alert("Error fetching theme results: " + e.toString());
        return;
    }

    if (!resultData.themes || !Array.isArray(resultData.themes)) {
        ui.alert(
            "Invalid theme results returned: " + JSON.stringify(resultData)
        );
        return;
    }

    writeResults(resultData.themes);
    // Save generated themes as a theme set named by timestamp
    try {
        const minimal = resultData.themes.map(function(t) {
            return {
                label: t.label,
                representatives: [
                    (t.representatives && t.representatives[0]) || "",
                    (t.representatives && t.representatives[1]) || ""
                ]
            };
        });
        const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        saveThemeSet(timestamp, minimal);
    } catch (e) {
        ui.alert('Warning: failed to save generated theme set: ' + e.toString());
    }
    ss.toast("Theme generation complete", "Pulse");

    function writeResults(themes) {
        let outputSheet = ss.getSheetByName("Themes");
        if (!outputSheet) {
            outputSheet = ss.insertSheet("Themes");
        } else {
            outputSheet.clear();
        }
        const headers = [
            "Short Label",
            "Label",
            "Description",
            "Representative 1",
            "Representative 2",
        ];
        outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        const rows = themes.map((theme) => [
            theme.shortLabel,
            theme.label,
            theme.description,
            theme.representatives[0] || "",
            theme.representatives[1] || "",
        ]);
        if (rows.length > 0) {
            outputSheet
                .getRange(2, 1, rows.length, headers.length)
                .setValues(rows);
        }
    }
}

/**
 * Prompts the user to select the input range for theme allocation.
 */
function allocateThemes() {
    showInputRangeDialog();
}
/**
 * Opens a dialog to select the input data range for theme allocation.
 */
function showInputRangeDialog() {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile("InputRangeDialog");
    template.dataRange = getActiveRangeA1Notation();
    const html = template.evaluate().setWidth(400).setHeight(200);
    ui.showModelessDialog(html, "Select Input Range");
}
/**
 * Callback after input range is selected; opens dialog to pick custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
/**
 * Callback after input range is selected; opens dialog to choose allocation mode.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
function allocateThemesWithRange(dataRange) {
    showAllocationModeDialog(dataRange);
}
/**
 * Retrieve stored theme sets from user properties.
 * @return {Array<{name: string, themes: Array<{label: string, representatives: string[]}>}>}
 */
function getThemeSets() {
    const props = PropertiesService.getUserProperties();
    const raw = props.getProperty("THEME_SETS");
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
/**
 * Save or update a named theme set.
 * @param {string} name
 * @param {Array<{label: string, representatives: string[]}>} themes
 * @return {{success: boolean}}
 */
function saveThemeSet(name, themes) {
    const props = PropertiesService.getUserProperties();
    const sets = getThemeSets().filter(function (s) {
        return s.name !== name;
    });
    sets.push({ name: name, themes: themes });
    props.setProperty("THEME_SETS", JSON.stringify(sets));
    return { success: true };
}
/**
 * Delete a named theme set.
 * @param {string} name
 * @return {{success: boolean}}
 */
function deleteThemeSet(name) {
    const props = PropertiesService.getUserProperties();
    const sets = getThemeSets().filter(function (s) {
        return s.name !== name;
    });
    props.setProperty("THEME_SETS", JSON.stringify(sets));
    return { success: true };
}
/**
 * Save a manually created theme set.
 * @param {{name: string, themes: Array<{label: string, rep1: string, rep2: string}>}} data
 * @return {{success: boolean}}
 */
function saveManualThemeSet(data) {
    const themes = data.themes.map(function (th) {
        return {
            label: th.label,
            representatives: [th.rep1 || "", th.rep2 || ""],
        };
    });
    return saveThemeSet(data.name, themes);
}
/**
 * Rename an existing theme set.
 * @param {string} oldName
 * @param {string} newName
 * @return {{success: boolean}}
 */
function renameThemeSet(oldName, newName) {
    const props = PropertiesService.getUserProperties();
    const sets = getThemeSets();
    for (let i = 0; i < sets.length; i++) {
        if (sets[i].name === oldName) {
            sets[i].name = newName;
            break;
        }
    }
    props.setProperty("THEME_SETS", JSON.stringify(sets));
    return { success: true };
}
/**
 * Opens a dialog to choose automatic theme generation or custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
function showAllocationModeDialog(dataRange) {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile("AllocationModeDialog");
    template.dataRange = dataRange;
    // Pass existing saved theme set names to the dialog template
    template.themeSetNames = getThemeSets().map(function (s) {
        return s.name;
    });
    const html = template.evaluate().setWidth(400).setHeight(200);
    ui.showModelessDialog(html, "Theme Allocation Mode");
}

/**
 * Calls the similarity endpoint to assign each input to the closest theme.
 */
function allocateThemesProcess(inputs, positions, themes, sheet) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const setA = inputs;
    const setB = themes.map(
        (t) => (t.representatives[0] || "") + " " + (t.representatives[1] || "")
    );
    const url = `${API_BASE}/similarity`;
    const options = {
        method: "post",
        contentType: "application/json",
        headers: {
            "X-API-Key": API_KEY,
            "Authorization": "Bearer " + getOAuthService().getAccessToken()
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
        ui.alert("Error calling similarity API: " + e.toString());
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
            "Allocation job submitted, polling for completion...",
            "Pulse"
        );

        let resultUrl;
        let attempt = 0;
        while (true) {
            Utilities.sleep(2000);
            if (attempt % 5 === 0) {
                ss.toast("Waiting for allocation job to complete...", "Pulse");
            }
            attempt++;

            let jobData;
            try {
            const jobResp = UrlFetchApp.fetch(
                `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`,
                {
                    method: "get",
                    headers: {
                        "X-API-Key": API_KEY,
                        "Authorization": "Bearer " + getOAuthService().getAccessToken()
                    },
                }
            );
                jobData = JSON.parse(jobResp.getContentText());
            } catch (e) {
                ui.alert(
                    "Error checking similarity job status: " + e.toString()
                );
                return;
            }
            if (jobData.status === "pending") {
                continue;
            } else if (jobData.status === "completed") {
                resultUrl = jobData.resultUrl;
                break;
            } else {
                ui.alert(
                    "Similarity job failed: " + (jobData.status || "unknown")
                );
                return;
            }
        }

        let resultData;
        try {
            const resultResp = UrlFetchApp.fetch(resultUrl, {
                method: "get",
                headers: {
                    "X-API-Key": API_KEY,
                    "Authorization": "Bearer " + getOAuthService().getAccessToken()
                },
            });
            resultData = JSON.parse(resultResp.getContentText());
        } catch (e) {
            ui.alert("Error fetching similarity results: " + e.toString());
            return;
        }
        if (!resultData.matrix && !resultData.flattened) {
            ui.alert(
                "Invalid similarity results returned: " +
                    JSON.stringify(resultData)
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
        ui.alert("Unexpected similarity response: " + JSON.stringify(data));
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
    ss.toast("Theme allocation complete", "Pulse");
}

/**
 * Runs when the add-on is installed.
 */
function onInstall(e) {
    onOpen(e);
}

/**
 * Opens the settings sidebar.
 */
function showSettingsSidebar() {
    // Pass webBase to the HTML template for registration links
    const template = HtmlService.createTemplateFromFile("Settings");
    template.webBase = WEB_BASE;
    const html = template.evaluate().setTitle("Pulse");
    SpreadsheetApp.getUi().showSidebar(html);
}
/**
 * Retrieves stored user email and authorization status.
 * @return {{email: string, isAuthorized: boolean}}
 */
function getSettings() {
    const props = PropertiesService.getUserProperties();
    return {
        email: props.getProperty("USER_EMAIL") || "",
        isAuthorized: isAuthorized()
    };
}

/**
 * Configures and returns the OAuth2 service.
 * @return {OAuth2.Service}
 */
function getOAuthService() {
    const orgId = PropertiesService.getUserProperties().getProperty("ORG_ID");

    if (!orgId) {
        return {
            hasAccess: () => false
        }
    }

    const orgIdParts = orgId.split("/");
    const auth0OrgId = orgIdParts[orgIdParts.length - 1];

    // Configure OAuth2 service using script properties
    return OAuth2.createService("ResearchWiseAI")
        .setAuthorizationBaseUrl(`https://${AUTH_DOMAIN}/authorize`)
        .setCache(CacheService.getUserCache())
        .setLock(LockService.getUserLock())
        .setTokenUrl(`https://${AUTH_DOMAIN}/oauth/token`)
        .setClientId(SCRIPT_PROPS.getProperty("CLIENT_ID"))
        .setClientSecret(SCRIPT_PROPS.getProperty("CLIENT_SECRET"))
        .setCallbackFunction("authCallback")
        .setPropertyStore(PropertiesService.getUserProperties())
        .setScope("openid profile email offline_access")
        .setParam("audience", API_AUD)
        .setParam("organization", auth0OrgId)
        .setParam("prompt", "consent")
        .setParam("login_hint", PropertiesService.getUserProperties().getProperty("USER_EMAIL"))
}

/**
 * Handles the OAuth2 callback.
 * @param {object} request
 * @return {HtmlOutput}
 */
function authCallback(request) {
    const service = getOAuthService();
    const authorized = service.handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput(
            "Success! You may close this dialog."
        );
    } else {
        return HtmlService.createHtmlOutput(
            "Denied. You may close this dialog."
        );
    }
}

/**
 * Returns the OAuth2 authorization URL.
 * @return {string}
 */
function getAuthorizationUrl() {
    return getOAuthService().getAuthorizationUrl();
}

/**
 * Resets the OAuth2 service (for reauthorization).
 */
function resetAuth() {
    getOAuthService().reset();
}

/**
 * Checks if the OAuth2 service has access.
 * @return {boolean}
 */
function isAuthorized() {
    return getOAuthService().hasAccess();
}
/**
 * Disconnects the user by clearing stored credentials.
 * @return {{success: boolean}}
 */
function disconnect() {
    const props = PropertiesService.getUserProperties();
    props.deleteProperty("USER_EMAIL");
    props.deleteProperty("ORG_ID");
    getOAuthService().reset();
    return { success: true };
}
/**
 * Finds the organization ID by email and persists it.
 * @param {string} email
 * @return {{success: boolean, orgId?: string, notFound?: boolean}}
 */
function findOrganization(email) {
    const props = PropertiesService.getUserProperties();
    // Unauthenticated lookup: POST email to /users endpoint
    const url = ORG_LOOKUP_URL;
    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ email: email }),
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());
        if (data.organizationId) {
            props.setProperty("USER_EMAIL", email);
            props.setProperty("ORG_ID", data.organizationId);
            return { success: true, orgId: data.organizationId };
        } else {
            return { success: false };
        }
    } catch (e) {
        if (e.toString().indexOf("returned code 404") !== -1) {
            return { success: false, notFound: true };
        }
        throw new Error("Error finding organization: " + e);
    }
}
/**
 * Shows a modeless dialog to collect custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
function showRangeDialog(dataRange) {
    const template = HtmlService.createTemplateFromFile("RangeDialog");
    template.dataRange = dataRange;
    const html = template.evaluate().setWidth(400).setHeight(350);
    SpreadsheetApp.getUi().showModelessDialog(html, "Custom Theme Ranges");
}
/**
 * Shows a dialog to manage saved theme sets.
 */
function showManageThemesDialog() {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile("ManageThemes");
    template.themeSets = getThemeSets();
    template.dataRange = getActiveRangeA1Notation();
    const html = template.evaluate().setWidth(500).setHeight(500);
    ui.showModelessDialog(html, "Manage Theme Sets");
}
/**
 * Automatically generates themes and allocates themes to data.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
function allocateThemesAutomatic(dataRange) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dataRangeObj;
    try {
        dataRangeObj = ss.getRange(dataRange);
    } catch (e) {
        ui.alert("Error reading data range: " + e.toString());
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
            if (text != null && text !== "") {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert("No text found in selected data range for theme allocation.");
        return;
    }
    const total = inputs.length;
    let usedInputs = inputs;
    let pct = 100;
    if (inputs.length > 1000) {
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
            "Sampling input: using " +
                usedInputs.length +
                " of " +
                total +
                " strings (" +
                pct +
                "%) for automatic theme generation."
        );
    }
    const url = `${API_BASE}/themes`;
    const options = {
        method: "post",
        contentType: "application/json",
        headers: {
            "X-API-Key": API_KEY,
            "Authorization": "Bearer " + getOAuthService().getAccessToken()
        },
        payload: JSON.stringify({ inputs: usedInputs }),
    };
    let data;
    try {
        const response = UrlFetchApp.fetch(url, options);
        data = JSON.parse(response.getContentText());
    } catch (e) {
        ui.alert("Error calling themes API: " + e.toString());
        return;
    }
    let themesData;
    if (data.themes && Array.isArray(data.themes)) {
        themesData = data.themes;
    } else if (data.jobId) {
        const jobId = data.jobId;
        ss.toast(
            "Theme generation job submitted, polling for completion...",
            "Pulse"
        );
        let resultUrl;
        let attempt = 0;
        while (true) {
            Utilities.sleep(2000);
            if (attempt % 5 === 0) {
                ss.toast(
                    "Waiting for theme generation job to complete...",
                    "Pulse"
                );
            }
            attempt++;
            let jobData;
            try {
                const jobResp = UrlFetchApp.fetch(
                    `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`,
                    {
                        method: "get",
                        headers: {
                            "X-API-Key": API_KEY,
                            "Authorization": "Bearer " + getOAuthService().getAccessToken()
                        },
                    }
                );
                jobData = JSON.parse(jobResp.getContentText());
            } catch (e) {
                ui.alert(
                    "Error checking theme generation job status: " +
                        e.toString()
                );
                return;
            }
            if (jobData.status === "pending") {
                continue;
            } else if (jobData.status === "completed") {
                resultUrl = jobData.resultUrl;
                break;
            } else {
                ui.alert(
                    "Theme generation job failed: " +
                        (jobData.status || "unknown")
                );
                return;
            }
        }
        let resultData;
        try {
            const resultResp = UrlFetchApp.fetch(resultUrl, {
                method: "get",
                headers: {
                    "X-API-Key": API_KEY,
                    "Authorization": "Bearer " + getOAuthService().getAccessToken()
                },
            });
            resultData = JSON.parse(resultResp.getContentText());
        } catch (e) {
            ui.alert(
                "Error fetching theme generation results: " + e.toString()
            );
            return;
        }
        if (!resultData.themes || !Array.isArray(resultData.themes)) {
            ui.alert(
                "Invalid theme generation results returned: " +
                    JSON.stringify(resultData)
            );
            return;
        }
        themesData = resultData.themes;
    } else {
        ui.alert(
            "Unexpected response from themes API: " + JSON.stringify(data)
        );
        return;
    }
    // Log full themes info to 'Themes' worksheet
    let outputSheet = ss.getSheetByName("Themes");
    if (!outputSheet) {
        outputSheet = ss.insertSheet("Themes");
    } else {
        outputSheet.clear();
    }
    const headers = [
        "Short Label",
        "Label",
        "Description",
        "Representative 1",
        "Representative 2",
    ];
    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const rows = themesData.map((theme) => [
        theme.shortLabel,
        theme.label,
        theme.description,
        theme.representatives[0] || "",
        theme.representatives[1] || "",
    ]);
    if (rows.length > 0) {
        outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    // Build minimal themes for saving and allocation
    const themes = themesData.map((theme) => ({
        label: theme.label,
        representatives: [
            theme.representatives[0] || "",
            theme.representatives[1] || "",
        ],
    }));
    // Save the new theme set with current timestamp as name
    try {
        const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        saveThemeSet(timestamp, themes);
    } catch (e) {
        // If saving fails, notify but continue allocation
        SpreadsheetApp.getUi().alert('Warning: failed to save automatic theme set: ' + e.toString());
    }
    // Allocate themes to data
    allocateThemesProcess(inputs, positions, themes, dataSheet);
}
/**
 * Returns the A1 notation of the current active selection.
 * @return {string}
 */
/**
 * Returns the A1 notation of the current active selection, prefixed with sheet name.
 * @return {string} e.g. 'Sheet1!A1:B10'
 */
function getActiveRangeA1Notation() {
    const range = SpreadsheetApp.getActiveRange();
    const sheet = range.getSheet();
    return `${sheet.getName()}!${range.getA1Notation()}`;
}
/**
 * Processes custom themes after the user submits ranges via dialog.
 * @param {{dataRange: string, labels: string, rep1: string, rep2: string}} ranges
 */
function processCustomThemes(ranges) {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Read data cells using full A1 notation (including sheet name) for safety across sheets
    let dataRangeObj;
    try {
        dataRangeObj = ss.getRange(ranges.dataRange);
    } catch (e) {
        ui.alert("Error reading data range: " + e.toString());
        return;
    }
    // Determine sheet and values for data range
    const dataSheet = dataRangeObj.getSheet();
    const values = dataRangeObj.getValues();
    const inputs = [];
    const positions = [];
    const startRow = dataRangeObj.getRow();
    const startCol = dataRangeObj.getColumn();
    for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[0].length; j++) {
            const text = values[i][j];
            if (text != null && text !== "") {
                inputs.push(text.toString());
                positions.push({ row: startRow + i, col: startCol + j });
            }
        }
    }
    if (inputs.length === 0) {
        ui.alert("No text found in selected data range for theme allocation.");
        return;
    }
    // Read custom theme ranges
    let labels, rep1, rep2;
    try {
        // Read custom theme ranges (supports sheet-qualified A1 notation)
        labels = ss.getRange(ranges.labels).getValues().flat();
        rep1 = ss.getRange(ranges.rep1).getValues().flat();
        rep2 = ss.getRange(ranges.rep2).getValues().flat();
    } catch (e) {
        ui.alert("Error reading custom ranges: " + e.toString());
        return;
    }
    if (labels.length !== rep1.length || labels.length !== rep2.length) {
        ui.alert("Selected ranges must have the same number of cells");
        return;
    }
    const themes = [];
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const ex1 = rep1[i];
        const ex2 = rep2[i];
        if (
            label != null &&
            label !== "" &&
            ex1 != null &&
            ex1 !== "" &&
            ex2 != null &&
            ex2 !== ""
        ) {
            themes.push({
                label: label.toString(),
                representatives: [ex1.toString(), ex2.toString()],
            });
        }
    }
    if (themes.length === 0) {
        ui.alert("No themes provided for allocation.");
        return;
    }
    // Perform allocation on the original data sheet
    allocateThemesProcess(inputs, positions, themes, dataSheet);
}
