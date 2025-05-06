/**
 * Prompts the user to confirm or change the range via a dialog.
 * @param defaultRange The default A1 range including sheet name (e.g., 'Sheet1!A1:B5').
 * @returns The confirmed range string, or null if cancelled.
 */
export function promptRange(defaultRange: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const url = `${window.location.origin}/SelectRangeDialog.html?range=${encodeURIComponent(defaultRange)}`;
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
                                resolve(msg.range);
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
