import { getRelativeUrl } from './relativeUrl';

/**
 * Prompts the user to confirm or change the range via a dialog.
 * @param defaultRange The default A1 range including sheet name (e.g., 'Sheet1!A1:B5').
 * @returns An object containing the confirmed range string (null if cancelled) and a flag indicating whether the first row contains header.
 */
export function promptRange(defaultRange: string): Promise<{ range: string | null; hasHeader: boolean }> {
    return new Promise((resolve, reject) => {
        const url = getRelativeUrl(
            `SelectRangeDialog.html?range=${encodeURIComponent(defaultRange)}`,
        );
        Office.context.ui.displayDialogAsync(
            url,
            { height: 30, width: 20, displayInIframe: true },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(result.error);
                } else {
                    const dialog = result.value;
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        (arg) => {
                            if ('error' in arg) {
                                console.error('Dialog error', arg.error);
                                dialog.close();
                                reject(arg.error);
                                return;
                            }
                            try {
                                const msg = JSON.parse(arg.message);
                                dialog.close();
                                resolve({ range: msg.range, hasHeader: !!msg.hasHeader });
                            } catch (e) {
                                dialog.close();
                                reject(e);
                            }
                        },
                    );
                }
            },
        );
    });
}

export async function confirmRange(
    context: Excel.RequestContext,
): Promise<{ range: string | null; hasHeader: boolean }> {
    const sel = context.workbook.getSelectedRange();
    sel.load('address');
    await context.sync();
    const defaultAddr: string = sel.address;
    return await promptRange(defaultAddr);
}
