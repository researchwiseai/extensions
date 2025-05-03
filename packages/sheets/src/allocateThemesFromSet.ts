import { allocateThemesProcess } from "./allocateThemesProcess";
import { getThemeSets } from "./getThemeSets";

/**
 * Allocate themes from an existing saved set.
 * @param {string} dataRange A1 notation of the data range.
 * @param {string} name Name of the saved theme set.
 */
export function allocateThemesFromSet(dataRange: string, name: string) {
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
        positions.push({ row: startRow + i, col: startCol + j });
      }
    }
  }
  if (inputs.length === 0) {
    ui.alert('No text found in selected data range for theme allocation.');
    return;
  }
  const setObj = getThemeSets().find(function (s) {
    return s.name === name;
  });
  if (!setObj) {
    ui.alert('Theme set not found: ' + name);
    return;
  }
  const themes = setObj.themes;
  allocateThemesProcess(inputs, positions, themes, dataSheet);
}
