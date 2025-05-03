// src/config.ts
var SCRIPT_PROPS = PropertiesService.getScriptProperties();
var API_BASE = SCRIPT_PROPS.getProperty("API_BASE") + "/pulse/v1";
var WEB_BASE = SCRIPT_PROPS.getProperty("WEB_BASE");
var AUTH_DOMAIN = SCRIPT_PROPS.getProperty("AUTH_DOMAIN");
var API_AUD = SCRIPT_PROPS.getProperty("API_AUD");
var ORG_LOOKUP_URL = `${WEB_BASE}/users`;

// src/getOAuthService.ts
function getOAuthService() {
  const orgId = PropertiesService.getUserProperties().getProperty("ORG_ID");
  if (!orgId) {
    return {
      hasAccess: () => false
    };
  }
  const orgIdParts = orgId.split("/");
  const auth0OrgId = orgIdParts[orgIdParts.length - 1];
  return OAuth2.createService("ResearchWiseAI").setAuthorizationBaseUrl(`https://${AUTH_DOMAIN}/authorize`).setCache(CacheService.getUserCache()).setLock(LockService.getUserLock()).setTokenUrl(`https://${AUTH_DOMAIN}/oauth/token`).setClientId(SCRIPT_PROPS.getProperty("CLIENT_ID")).setClientSecret(SCRIPT_PROPS.getProperty("CLIENT_SECRET")).setCallbackFunction("authCallback").setPropertyStore(PropertiesService.getUserProperties()).setScope("openid profile email offline_access").setParam("audience", API_AUD).setParam("organization", auth0OrgId).setParam("prompt", "consent").setParam("login_hint", PropertiesService.getUserProperties().getProperty("USER_EMAIL"));
}

// src/auth.ts
function authCallback(request) {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput("Success! You may close this dialog.");
  } else {
    return HtmlService.createHtmlOutput("Denied. You may close this dialog.");
  }
}
function getAuthorizationUrl() {
  return getOAuthService().getAuthorizationUrl();
}
function isAuthorized() {
  return getOAuthService().hasAccess();
}
function disconnect() {
  const props = PropertiesService.getUserProperties();
  try {
    getOAuthService().reset();
  } catch {
    console.warn("Error resetting OAuth service");
  }
  props.deleteProperty("USER_EMAIL");
  props.deleteProperty("ORG_ID");
  return { success: true };
}
function findOrganization(email) {
  const props = PropertiesService.getUserProperties();
  const url = ORG_LOOKUP_URL;
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ email })
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

// src/getThemeSets.ts
function getThemeSets() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty("THEME_SETS");
  if (!raw)
  return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// src/saveThemeSet.ts
function saveThemeSet(name, themes) {
  const props = PropertiesService.getUserProperties();
  const sets = getThemeSets().filter(function (s) {
    return s.name !== name;
  });
  sets.push({ name, themes });
  props.setProperty("THEME_SETS", JSON.stringify(sets));
  return { success: true };
}

// src/showAllocationModeDialog.ts
function showAllocationModeDialog(dataRange) {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("AllocationModeDialog");
  template.dataRange = dataRange;
  template.themeSetNames = getThemeSets().map(function (s) {
    return s.name;
  });
  const html = template.evaluate().setWidth(400).setHeight(200);
  ui.showModelessDialog(html, "Theme Allocation Mode");
}

// src/showInputRangeDialog.ts
function showInputRangeDialog() {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("InputRangeDialog");
  template.dataRange = getActiveRangeA1Notation();
  const html = template.evaluate().setWidth(400).setHeight(200);
  ui.showModelessDialog(html, "Select Input Range");
}
// src/allocateThemesProcess.ts
function allocateThemesProcess(inputs, positions, themes, sheet) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setA = inputs;
  const setB = themes.map((t) => (t.representatives[0] || "") + " " + (t.representatives[1] || ""));
  const url = `${API_BASE}/similarity`;
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOAuthService().getAccessToken()
    },
    payload: JSON.stringify({ set_a: setA, set_b: setB, fast: false })
  };
  let data;
  try {
    const response = UrlFetchApp.fetch(url, options);
    data = JSON.parse(response.getContentText());
  } catch (e) {
    ui.alert("Error calling similarity API: " + e.toString());
    return;
  }
  let matrix;
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
  } else if (data.jobId) {
    const jobId = data.jobId;
    ss.toast("Allocation job submitted, polling for completion...", "Pulse");
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
        const jobResp = UrlFetchApp.fetch(`${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
          method: "get",
          headers: {
            Authorization: "Bearer " + getOAuthService().getAccessToken()
          }
        });
        jobData = JSON.parse(jobResp.getContentText());
      } catch (e) {
        ui.alert("Error checking similarity job status: " + e.toString());
        return;
      }
      if (jobData.status === "pending") {
        continue;
      } else if (jobData.status === "completed") {
        resultUrl = jobData.resultUrl;
        break;
      } else {
        ui.alert("Similarity job failed: " + (jobData.status || "unknown"));
        return;
      }
    }
    let resultData;
    try {
      const resultResp = UrlFetchApp.fetch(resultUrl, {
        method: "get"
      });
      resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
      ui.alert("Error fetching similarity results: " + e.toString());
      return;
    }
    if (!resultData.matrix && !resultData.flattened) {
      ui.alert("Invalid similarity results returned: " + JSON.stringify(resultData));
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
  } else {
    ui.alert("Unexpected similarity response: " + JSON.stringify(data));
    return;
  }
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

// src/allocateAndSaveThemeSet.ts
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
    pct = Math.round(usedInputs.length / total * 100);
    ui.alert("Sampling input: using " + usedInputs.length + " of " + total + " strings (" + pct + "%) for theme generation.");
  }
  const url = `${API_BASE}/themes`;
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOAuthService().getAccessToken()
    },
    payload: JSON.stringify({ inputs: usedInputs })
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
    ss.toast("Theme generation job submitted, polling for completion...", "Pulse");
    let resultUrl;
    let attempt = 0;
    while (true) {
      Utilities.sleep(2000);
      if (attempt % 5 === 0) {
        ss.toast("Waiting for theme generation job to complete...", "Pulse");
      }
      attempt++;
      let jobData;
      try {
        const jobResp = UrlFetchApp.fetch(`${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
          method: "get",
          headers: {
            Authorization: "Bearer " + getOAuthService().getAccessToken()
          }
        });
        jobData = JSON.parse(jobResp.getContentText());
      } catch (e) {
        ui.alert("Error checking theme generation job status: " + e.toString());
        return;
      }
      if (jobData.status === "pending") {
        continue;
      } else if (jobData.status === "completed") {
        resultUrl = jobData.resultUrl;
        break;
      } else {
        ui.alert("Theme generation job failed: " + (jobData.status || "unknown"));
        return;
      }
    }
    let resultData;
    try {
      const resultResp = UrlFetchApp.fetch(resultUrl, {
        method: "get",
        headers: {
          Authorization: "Bearer " + getOAuthService().getAccessToken()
        }
      });
      resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
      ui.alert("Error fetching theme generation results: " + e.toString());
      return;
    }
    if (!resultData.themes || !Array.isArray(resultData.themes)) {
      ui.alert("Invalid theme generation results returned: " + JSON.stringify(resultData));
      return;
    }
    themesData = resultData.themes;
  } else {
    ui.alert("Unexpected response from themes API: " + JSON.stringify(data));
    return;
  }
  const themes = themesData.map(function (t) {
    return {
      label: t.label,
      representatives: [
      t.representatives && t.representatives[0] || "",
      t.representatives && t.representatives[1] || ""]

    };
  });
  saveThemeSet(name, themes);
  allocateThemesProcess(inputs, positions, themes, dataSheet);
}
// src/allocateThemesFromSet.ts
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
// src/allocateThemesAutomatic.ts
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
    pct = Math.round(usedInputs.length / total * 100);
    ui.alert("Sampling input: using " + usedInputs.length + " of " + total + " strings (" + pct + "%) for automatic theme generation.");
  }
  const url = `${API_BASE}/themes`;
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOAuthService().getAccessToken()
    },
    payload: JSON.stringify({ inputs: usedInputs })
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
    ss.toast("Theme generation job submitted, polling for completion...", "Pulse");
    let resultUrl;
    let attempt = 0;
    while (true) {
      Utilities.sleep(2000);
      if (attempt % 5 === 0) {
        ss.toast("Waiting for theme generation job to complete...", "Pulse");
      }
      attempt++;
      let jobData;
      try {
        const jobResp = UrlFetchApp.fetch(`${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
          method: "get",
          headers: {
            Authorization: "Bearer " + getOAuthService().getAccessToken()
          }
        });
        jobData = JSON.parse(jobResp.getContentText());
      } catch (e) {
        ui.alert("Error checking theme generation job status: " + e.toString());
        return;
      }
      if (jobData.status === "pending") {
        continue;
      } else if (jobData.status === "completed") {
        resultUrl = jobData.resultUrl;
        break;
      } else {
        ui.alert("Theme generation job failed: " + (jobData.status || "unknown"));
        return;
      }
    }
    let resultData;
    try {
      const resultResp = UrlFetchApp.fetch(resultUrl, {
        method: "get"
      });
      resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
      ui.alert("Error fetching theme generation results: " + e.toString());
      return;
    }
    if (!resultData.themes || !Array.isArray(resultData.themes)) {
      ui.alert("Invalid theme generation results returned: " + JSON.stringify(resultData));
      return;
    }
    themesData = resultData.themes;
  } else {
    ui.alert("Unexpected response from themes API: " + JSON.stringify(data));
    return;
  }
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
  "Representative 2"];

  outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const rows = themesData.map((theme) => [
  theme.shortLabel,
  theme.label,
  theme.description,
  theme.representatives[0] || "",
  theme.representatives[1] || ""]
  );
  if (rows.length > 0) {
    outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  const themes = themesData.map((theme) => ({
    label: theme.label,
    representatives: [
    theme.representatives[0] || "",
    theme.representatives[1] || ""]

  }));
  try {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    saveThemeSet(timestamp, themes);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Warning: failed to save automatic theme set: " + e.toString());
  }
  allocateThemesProcess(inputs, positions, themes, dataSheet);
}
// src/analyzeSentiment.ts
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
  for (let i2 = 0; i2 < numRows; i2++) {
    for (let j = 0; j < numCols; j++) {
      const text = values[i2][j];
      if (text != null && text !== "") {
        inputs.push(text.toString());
        positions.push({ row: startRow + i2, col: startCol + j });
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
      Authorization: "Bearer " + getOAuthService().getAccessToken()
    },
    payload: JSON.stringify({ inputs })
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
    ui.alert("Unexpected response from sentiment API: " + JSON.stringify(data));
    return;
  }
  const jobId = data.jobId;
  ss.toast("Sentiment job submitted, polling for completion...", "Pulse");
  let resultUrl;
  let i = 0;
  while (true) {
    Utilities.sleep(2000);
    if (i % 5 === 0) {
      ss.toast("Waiting for sentiment job to complete...", "Pulse");
    }
    i += 1;
    let jobData;
    try {
      const jobResp = UrlFetchApp.fetch(`${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
        method: "get",
        headers: {
          Authorization: "Bearer " + getOAuthService().getAccessToken()
        }
      });
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
      method: "get"
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
// src/processCustomThemes.ts
function processCustomThemes(ranges) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dataRangeObj;
  try {
    dataRangeObj = ss.getRange(ranges.dataRange);
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
  let labels, rep1, rep2;
  try {
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
    if (label != null && label !== "" && ex1 != null && ex1 !== "" && ex2 != null && ex2 !== "") {
      themes.push({
        label: label.toString(),
        representatives: [ex1.toString(), ex2.toString()]
      });
    }
  }
  if (themes.length === 0) {
    ui.alert("No themes provided for allocation.");
    return;
  }
  allocateThemesProcess(inputs, positions, themes, dataSheet);
}
// src/generateThemes.ts
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
    usedInputs = inputs.slice();
    for (let i = usedInputs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = usedInputs[i];
      usedInputs[i] = usedInputs[j];
      usedInputs[j] = temp;
    }
    usedInputs = usedInputs.slice(0, 1000);
    pct = Math.round(usedInputs.length / total * 100);
    ui.alert("Sampling input: using " + usedInputs.length + " of " + total + " strings (" + pct + "%) for theme generation.");
  }
  const url = `${API_BASE}/themes`;
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOAuthService().getAccessToken()
    },
    payload: JSON.stringify({ inputs: usedInputs })
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
    try {
      const minimal = data.themes.map(function (t) {
        return {
          label: t.label,
          representatives: [
          t.representatives && t.representatives[0] || "",
          t.representatives && t.representatives[1] || ""]

        };
      });
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      saveThemeSet(timestamp, minimal);
    } catch (e) {
      ui.alert("Warning: failed to save generated theme set: " + e.toString());
    }
    ss.toast("Theme generation complete", "Pulse");
    return;
  }
  if (!data.jobId) {
    ui.alert("Unexpected response from themes API: " + JSON.stringify(data));
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
      const jobResp = UrlFetchApp.fetch(`${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
        method: "get",
        headers: {
          Authorization: "Bearer " + getOAuthService().getAccessToken()
        }
      });
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
      method: "get"
    });
    resultData = JSON.parse(resultResp.getContentText());
  } catch (e) {
    ui.alert("Error fetching theme results: " + e.toString());
    return;
  }
  if (!resultData.themes || !Array.isArray(resultData.themes)) {
    ui.alert("Invalid theme results returned: " + JSON.stringify(resultData));
    return;
  }
  writeResults(resultData.themes);
  try {
    const minimal = resultData.themes.map(function (t) {
      return {
        label: t.label,
        representatives: [
        t.representatives && t.representatives[0] || "",
        t.representatives && t.representatives[1] || ""]

      };
    });
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    saveThemeSet(timestamp, minimal);
  } catch (e) {
    ui.alert("Warning: failed to save generated theme set: " + e.toString());
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
    "Representative 2"];

    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const rows = themes.map((theme) => [
    theme.shortLabel,
    theme.label,
    theme.description,
    theme.representatives[0] || "",
    theme.representatives[1] || ""]
    );
    if (rows.length > 0) {
      outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }
}
// src/updateMenu.ts
function updateMenu() {
  const ui = SpreadsheetApp.getUi();
  const pulseMenu = ui.createMenu("Pulse");
  if (getOAuthService().hasAccess()) {
    pulseMenu.addItem("Analyze Sentiment", "analyzeSentiment");
    const themesMenu = ui.createMenu("Themes").addItem("Generate", "generateThemes").addItem("Allocate", "allocateThemes").addItem("Manage", "showManageThemesDialog");
    pulseMenu.addSubMenu(themesMenu);
    pulseMenu.addSeparator();
  }
  pulseMenu.addItem("Settings", "showSettingsSidebar");
  pulseMenu.addToUi();
}
// src/deleteThemeSet.ts
function deleteThemeSet(name) {
  const props = PropertiesService.getUserProperties();
  const sets = getThemeSets().filter(function (s) {
    return s.name !== name;
  });
  props.setProperty("THEME_SETS", JSON.stringify(sets));
  return { success: true };
}

// src/Code.ts
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const pulseMenu = ui.createMenu("Pulse");
  if (getOAuthService().hasAccess()) {
    pulseMenu.addItem("Analyze Sentiment", "analyzeSentiment");
    const themesMenu = ui.createMenu("Themes").addItem("Generate", "generateThemes").addItem("Allocate", "allocateThemes").addItem("Manage", "showManageThemesDialog");
    pulseMenu.addSubMenu(themesMenu);
    pulseMenu.addSeparator();
  }
  pulseMenu.addItem("Settings", "showSettingsSidebar");
  pulseMenu.addToUi();
}
function allocateThemes() {
  showInputRangeDialog();
}
function allocateThemesWithRange(dataRange) {
  showAllocationModeDialog(dataRange);
}
function saveManualThemeSet(data) {
  const themes = data.themes.map(function (th) {
    return {
      label: th.label,
      representatives: [th.rep1 || "", th.rep2 || ""]
    };
  });
  return saveThemeSet(data.name, themes);
}
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
function onInstall() {
  onOpen();
}
function showSettingsSidebar() {
  const template = HtmlService.createTemplateFromFile("Settings");
  template.webBase = WEB_BASE;
  const html = template.evaluate().setTitle("Pulse");
  SpreadsheetApp.getUi().showSidebar(html);
}
function getSettings() {
  const props = PropertiesService.getUserProperties();
  return {
    email: props.getProperty("USER_EMAIL") || "",
    isAuthorized: isAuthorized()
  };
}
function showRangeDialog(dataRange) {
  const template = HtmlService.createTemplateFromFile("RangeDialog");
  template.dataRange = dataRange;
  const html = template.evaluate().setWidth(400).setHeight(350);
  SpreadsheetApp.getUi().showModelessDialog(html, "Custom Theme Ranges");
}
function showManageThemesDialog() {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("ManageThemes");
  template.themeSets = getThemeSets();
  template.dataRange = getActiveRangeA1Notation();
  const html = template.evaluate().setWidth(500).setHeight(500);
  ui.showModelessDialog(html, "Manage Theme Sets");
}
function getActiveRangeA1Notation() {
  const range = SpreadsheetApp.getActiveRange();
  const sheet = range.getSheet();
  return `${sheet.getName()}!${range.getA1Notation()}`;
}