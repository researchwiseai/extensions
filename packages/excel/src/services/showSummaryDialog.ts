import { getRelativeUrl } from './relativeUrl';

export function showSummaryDialog(summary: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Use query params to pass the summary content and auth capability
        async function open() {
            const url = getRelativeUrl(
                `SummarizeResultDialog.html?summary=${encodeURIComponent(summary)}`,
            );
            Office.context.ui.displayDialogAsync(
                url,
                // Make the dialog larger for better readability
                { height: 70, width: 70, displayInIframe: true },
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Failed) {
                        if ((result.error as any)?.code === 12007) {
                            setTimeout(open, 100);
                        } else {
                            reject(result.error);
                        }
                    } else {
                        const dialog = result.value;
                        dialog.addEventHandler(
                            Office.EventType.DialogMessageReceived,
                            () => {
                                dialog.close();
                                resolve();
                            },
                        );
                    }
                },
            );
        }
        open();
    });
}
