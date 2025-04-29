const API_BASE = 'https://dev.core.researchwiseai.com/pulse/v1';
const API_KEY  = 'YOUR_API_KEY_HERE';  // <- set your key here!

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Pulse')
    .addItem('Analyze Sentiment…', 'analyzeSentiment')
    .addItem('Generate Themes…', 'generateThemes')
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