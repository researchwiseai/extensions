import { allocateThemesProcess } from "./allocateThemesProcess";

/**
 * Processes custom themes after the user submits ranges via dialog.
 *
 * Called by FE
 *
 * @param {{dataRange: string, labels: string, rep1: string, rep2: string}} ranges
 */
export function processCustomThemes(ranges: { dataRange: string; labels: string; rep1: string; rep2: string; }) {
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
        positions.push({ row: startRow + i, col: startCol + j });
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
    rep1 = ss.getRange(ranges.rep1).getValues().flat();
    rep2 = ss.getRange(ranges.rep2).getValues().flat();
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
    if (label != null &&
      label !== '' &&
      ex1 != null &&
      ex1 !== '' &&
      ex2 != null &&
      ex2 !== '') {
      themes.push({
        label: label.toString(),
        representatives: [ex1.toString(), ex2.toString()],
      });
    }
  }
  if (themes.length === 0) {
    ui.alert('No themes provided for allocation.');
    return;
  }
  // Perform allocation on the original data sheet
  allocateThemesProcess(inputs, positions, themes, dataSheet);
}
