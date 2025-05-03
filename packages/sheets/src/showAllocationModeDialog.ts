import { getThemeSets } from "./getThemeSets";

/**
 * Opens a dialog to choose automatic theme generation or custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export function showAllocationModeDialog(dataRange: string) {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile('AllocationModeDialog');
  template.dataRange = dataRange;
  // Pass existing saved theme set names to the dialog template
  template.themeSetNames = getThemeSets().map(function (s) {
    return s.name;
  });
  const html = template.evaluate().setWidth(400).setHeight(200);
  ui.showModelessDialog(html, 'Theme Allocation Mode');
}
