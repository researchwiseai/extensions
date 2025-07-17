export async function maybeActivateSheet(
    context: Excel.RequestContext,
    sheet: Excel.Worksheet,
    startTime: number,
    thresholdMs = 20000,
): Promise<void> {
    if (Date.now() - startTime <= thresholdMs) {
        sheet.activate();
        await context.sync();
    }
}
