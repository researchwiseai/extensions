import { getRelativeUrl } from './relativeUrl';

export type ExtractionOptions = {
    category: string | null;
    expand: boolean;
};

/**
 * Prompt for extraction options (category + allow expansion).
 */
export function promptExtractionOptions(): Promise<ExtractionOptions> {
    return new Promise((resolve, reject) => {
        const url = getRelativeUrl('ExtractionOptionsDialog.html');
        Office.context.ui.displayDialogAsync(
            url,
            { height: 35, width: 25, displayInIframe: true },
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
                                resolve({
                                    category: msg.category ?? null,
                                    expand: !!msg.expand,
                                });
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
