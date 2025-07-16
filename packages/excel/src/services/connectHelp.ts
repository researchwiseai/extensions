import { getRelativeUrl } from './relativeUrl';

export function showConnectHelpDialog(): Promise<void> {
    return new Promise((resolve, reject) => {
        const url = getRelativeUrl('ConnectHelpDialog.html');
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
                        () => {
                            dialog.close();
                            resolve();
                        },
                    );
                }
            },
        );
    });
}
