import { getRelativeUrl } from './relativeUrl';

export function showSummaryDialog(summary: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Use query param to pass the summary content
        const url = getRelativeUrl(
            `SummarizeResultDialog.html?summary=${encodeURIComponent(summary)}`,
        );
        function open() {
            Office.context.ui.displayDialogAsync(
                url,
                { height: 60, width: 40, displayInIframe: true },
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
