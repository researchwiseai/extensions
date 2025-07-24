import { getThemeSets } from 'pulse-common';

/**
 * Opens a dialog to choose automatic theme generation or custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export async function showAllocationModeDialog(
    dataRange: string,
    hasHeader = false,
) {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile('AllocationModeDialog');
    template.dataRange = dataRange;
    template.hasHeader = hasHeader;
    // Pass existing saved theme set names to the dialog template
    const themeSet = await getThemeSets();
    template.themeSetNames = themeSet.map(function (s) {
        return s.name;
    });
    const html = template.evaluate().setWidth(400).setHeight(200);
    ui.showModelessDialog(html, 'Theme Allocation Mode');
}
