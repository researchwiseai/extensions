import { getActiveRangeA1Notation } from './Code';

/**
 * Opens a dialog to select the input data range for theme allocation.
 */
export function showInputRangeDialog(mode: 'allocation' | 'generation') {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile('InputRangeDialog');
    template.dataRange = getActiveRangeA1Notation();
    template.mode = mode;
    const html = template.evaluate().setWidth(400).setHeight(200);
    ui.showModelessDialog(html, 'Select Input Range');
}
