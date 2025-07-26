import { getActiveRangeA1Notation } from './Code';

/**
 * Opens a dialog to select the input data range for theme allocation.
 */
/**
 * Opens a dialog to confirm or change the input data range.
 * @param mode 'allocation', 'generation', or 'sentiment'
 */
export function showInputRangeDialog(
    mode: 'allocation' | 'generation' | 'sentiment' | 'matrix' | 'similarity',
) {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile('InputRangeDialog');
    template.dataRange = getActiveRangeA1Notation();
    template.mode = mode;
    const html = template.evaluate().setWidth(400).setHeight(200);
    ui.showModelessDialog(html, 'Select Input Range');
}
