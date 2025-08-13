export async function applyTextColumnFormatting(
    sheet: Excel.Worksheet,
    context: Excel.RequestContext,
    column: string = 'A',
) {
    // Target entire column (e.g., "A:A")
    const colRange = sheet.getRange(`${column}:${column}`);

    // Enable wrapping so long text shows on multiple lines
    colRange.format.wrapText = true;

    // Make the column wider to accommodate long text.
    // Office.js uses points for columnWidth; choose a generous width.
    // If setting fails on some platforms, keep going gracefully.
    try {
        colRange.format.columnWidth = 320; // target ~320 default units
        console.log(`Set column width for ${column} to 320 points.`);
    } catch {
        // no-op: not all hosts allow setting fixed column widths
        console.warn(`Failed to set column width for ${column}.`);
    }

    // Autofit row heights so wrapped text is fully visible
    const used = sheet.getUsedRange();
    used.format.autofitRows();

    await context.sync();
}
