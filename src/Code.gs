const API_BASE = 'https://dev.core.researchwiseai.com/pulse/v1';
const API_KEY  = 'YOUR_API_KEY_HERE';  // <- set your key here!

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Pulse')
    .addItem('Analyze Sentiment…', 'analyzeSentiment')
    .addItem('Generate Themes…', 'generateThemes')
    .addItem('Allocate Themes…', 'allocateThemes')
    .addSeparator()
    .addItem('Settings', 'showSettingsSidebar')
    .addToUi();
}
function analyzeSentiment() {
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
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-API-Key': API_KEY },
    payload: JSON.stringify({ inputs })
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
    ui.alert('Unexpected response from sentiment API: ' + JSON.stringify(data));
    return;
  }

  const jobId = data.jobId;
  ss.toast('Sentiment job submitted, polling for completion...', 'Pulse');

  let resultUrl;
  let i = 0
  while (true) {
    Utilities.sleep(2000);

    if ( i % 5 === 0 ) {
      // Show toast every 5 seconds to say we are still waiting
      ss.toast('Waiting for sentiment job to complete...', 'Pulse');
    }

    i += 1;

    let jobData;
    try {
      const jobResp = UrlFetchApp.fetch(`${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
        method: 'get',
        headers: { 'X-API-Key': API_KEY }
      });
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
      headers: { 'X-API-Key': API_KEY }
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

function generateThemes() {
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
      'Sampling input: using ' + usedInputs.length + ' of ' + total +
      ' strings (' + pct + '%) for theme generation.'
    );
  }

  const url = `${API_BASE}/themes`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-API-Key': API_KEY },
    payload: JSON.stringify({ inputs: usedInputs })
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
    ss.toast('Theme generation complete', 'Pulse');
    return;
  }

  if (!data.jobId) {
    ui.alert('Unexpected response from themes API: ' + JSON.stringify(data));
    return;
  }

  const jobId = data.jobId;
  ss.toast('Theme job submitted, polling for completion...', 'Pulse');

  let resultUrl;
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
        `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
          method: 'get',
          headers: { 'X-API-Key': API_KEY }
        }
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
      headers: { 'X-API-Key': API_KEY }
    });
    resultData = JSON.parse(resultResp.getContentText());
  } catch (e) {
    ui.alert('Error fetching theme results: ' + e.toString());
    return;
  }

  if (!resultData.themes || !Array.isArray(resultData.themes)) {
    ui.alert('Invalid theme results returned: ' + JSON.stringify(resultData));
    return;
  }

  writeResults(resultData.themes);
  ss.toast('Theme generation complete', 'Pulse');

  function writeResults(themes) {
    let outputSheet = ss.getSheetByName('Themes');
    if (!outputSheet) {
      outputSheet = ss.insertSheet('Themes');
    } else {
      outputSheet.clear();
    }
    const headers = ['Short Label', 'Label', 'Description',
                     'Representative 1', 'Representative 2'];
    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const rows = themes.map(theme => [
      theme.shortLabel,
      theme.label,
      theme.description,
      theme.representatives[0] || '',
      theme.representatives[1] || ''
    ]);
    if (rows.length > 0) {
      outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
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
  const template = HtmlService.createTemplateFromFile('InputRangeDialog');
  template.dataRange = getActiveRangeA1Notation();
  const html = template.evaluate()
    .setWidth(400)
    .setHeight(200);
  ui.showModalDialog(html, 'Select Input Range');
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
 * Opens a dialog to choose automatic theme generation or custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
function showAllocationModeDialog(dataRange) {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile('AllocationModeDialog');
  template.dataRange = dataRange;
  const html = template.evaluate()
    .setWidth(400)
    .setHeight(200);
  ui.showModalDialog(html, 'Theme Allocation Mode');
}

/**
 * Calls the similarity endpoint to assign each input to the closest theme.
 */
function allocateThemesProcess(inputs, positions, themes, sheet) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setA = inputs;
  const setB = themes.map(t => (t.representatives[0] || '') + ' ' + (t.representatives[1] || ''));
  const url = `${API_BASE}/similarity`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {'X-API-Key': API_KEY},
    // fast=false triggers async polling behavior
    payload: JSON.stringify({set_a: setA, set_b: setB, fast: false})
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
    ss.toast('Allocation job submitted, polling for completion...', 'Pulse');

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
          `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
            method: 'get',
            headers: { 'X-API-Key': API_KEY }
          }
        );
        jobData = JSON.parse(jobResp.getContentText());
      } catch (e) {
        ui.alert('Error checking similarity job status: ' + e.toString());
        return;
      }
      if (jobData.status === 'pending') {
        continue;
      } else if (jobData.status === 'completed') {
        resultUrl = jobData.resultUrl;
        break;
      } else {
        ui.alert('Similarity job failed: ' + (jobData.status || 'unknown'));
        return;
      }
    }

    let resultData;
    try {
      const resultResp = UrlFetchApp.fetch(resultUrl, {
        method: 'get',
        headers: { 'X-API-Key': API_KEY }
      });
      resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
      ui.alert('Error fetching similarity results: ' + e.toString());
      return;
    }
    if (!resultData.matrix && !resultData.flattened) {
      ui.alert('Invalid similarity results returned: ' + JSON.stringify(resultData));
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
  const html = HtmlService.createHtmlOutputFromFile('Settings')
      .setTitle('Settings');
  SpreadsheetApp.getUi().showSidebar(html);
}
/**
 * Retrieves stored user settings.
 * @return {{clientId: string, clientSecret: string}}
 */
function getSettings() {
  const props = PropertiesService.getUserProperties();
  return {
    clientId: props.getProperty('CLIENT_ID') || '',
    clientSecret: props.getProperty('CLIENT_SECRET') || ''
  };
}

/**
 * Saves user settings from the sidebar.
 * @param {{clientId: string, clientSecret: string}} settings
 * @return {{success: boolean}}
 */
function saveSettings(settings) {
  const props = PropertiesService.getUserProperties();
  props.setProperty('CLIENT_ID', settings.clientId);
  props.setProperty('CLIENT_SECRET', settings.clientSecret);
  return { success: true };
}
/**
 * Shows a modeless dialog to collect custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
function showRangeDialog(dataRange) {
  const template = HtmlService.createTemplateFromFile('RangeDialog');
  template.dataRange = dataRange;
  const html = template.evaluate()
    .setWidth(400)
    .setHeight(350);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Custom Theme Ranges');
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
        positions.push({row: startRow + i, col: startCol + j});
      }
    }
  }
  if (inputs.length === 0) {
    ui.alert('No text found in selected data range for theme allocation.');
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
    ui.alert('Sampling input: using ' + usedInputs.length + ' of ' + total +
      ' strings (' + pct + '%) for automatic theme generation.');
  }
  const url = `${API_BASE}/themes`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {'X-API-Key': API_KEY},
    payload: JSON.stringify({inputs: usedInputs})
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
    ss.toast('Theme generation job submitted, polling for completion...', 'Pulse');
    let resultUrl;
    let attempt = 0;
    while (true) {
      Utilities.sleep(2000);
      if (attempt % 5 === 0) {
        ss.toast('Waiting for theme generation job to complete...', 'Pulse');
      }
      attempt++;
      let jobData;
      try {
        const jobResp = UrlFetchApp.fetch(
          `${API_BASE}/jobs?jobId=${encodeURIComponent(jobId)}`, {
            method: 'get',
            headers: {'X-API-Key': API_KEY}
          }
        );
        jobData = JSON.parse(jobResp.getContentText());
      } catch (e) {
        ui.alert('Error checking theme generation job status: ' + e.toString());
        return;
      }
      if (jobData.status === 'pending') {
        continue;
      } else if (jobData.status === 'completed') {
        resultUrl = jobData.resultUrl;
        break;
      } else {
        ui.alert('Theme generation job failed: ' + (jobData.status || 'unknown'));
        return;
      }
    }
    let resultData;
    try {
      const resultResp = UrlFetchApp.fetch(resultUrl, {
        method: 'get',
        headers: {'X-API-Key': API_KEY}
      });
      resultData = JSON.parse(resultResp.getContentText());
    } catch (e) {
      ui.alert('Error fetching theme generation results: ' + e.toString());
      return;
    }
    if (!resultData.themes || !Array.isArray(resultData.themes)) {
      ui.alert('Invalid theme generation results returned: ' + JSON.stringify(resultData));
      return;
    }
    themesData = resultData.themes;
  } else {
    ui.alert('Unexpected response from themes API: ' + JSON.stringify(data));
    return;
  }
  // Log full themes info to 'Themes' worksheet
  let outputSheet = ss.getSheetByName('Themes');
  if (!outputSheet) {
    outputSheet = ss.insertSheet('Themes');
  } else {
    outputSheet.clear();
  }
  const headers = ['Short Label', 'Label', 'Description', 'Representative 1', 'Representative 2'];
  outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const rows = themesData.map(theme => [
    theme.shortLabel,
    theme.label,
    theme.description,
    theme.representatives[0] || '',
    theme.representatives[1] || ''
  ]);
  if (rows.length > 0) {
    outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  const themes = themesData.map(theme => ({
    label: theme.label,
    representatives: [theme.representatives[0] || '', theme.representatives[1] || '']
  }));
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
    ui.alert('Error reading data range: ' + e.toString());
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
      if (text != null && text !== '') {
        inputs.push(text.toString());
        positions.push({row: startRow + i, col: startCol + j});
      }
    }
  }
  if (inputs.length === 0) {
    ui.alert('No text found in selected data range for theme allocation.');
    return;
  }
  // Read custom theme ranges
  let labels, rep1, rep2;
  try {
    // Read custom theme ranges (supports sheet-qualified A1 notation)
    labels = ss.getRange(ranges.labels).getValues().flat();
    rep1   = ss.getRange(ranges.rep1).getValues().flat();
    rep2   = ss.getRange(ranges.rep2).getValues().flat();
  } catch (e) {
    ui.alert('Error reading custom ranges: ' + e.toString());
    return;
  }
  if (labels.length !== rep1.length || labels.length !== rep2.length) {
    ui.alert('Selected ranges must have the same number of cells');
    return;
  }
  const themes = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const ex1 = rep1[i];
    const ex2 = rep2[i];
    if (label != null && label !== '' && ex1 != null && ex1 !== '' && ex2 != null && ex2 !== '') {
      themes.push({label: label.toString(), representatives: [ex1.toString(), ex2.toString()]});
    }
  }
  if (themes.length === 0) {
    ui.alert('No themes provided for allocation.');
    return;
  }
  // Perform allocation on the original data sheet
  allocateThemesProcess(inputs, positions, themes, dataSheet);
}