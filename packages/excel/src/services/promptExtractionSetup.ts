import { getRelativeUrl } from './relativeUrl';

export type ExtractionSetup = {
    sheetName: string | null;
    hasHeader: boolean;
};

export function promptExtractionSetup(
    sheetNames: string[],
    currentSheet: string | null,
): Promise<ExtractionSetup | null> {
    return new Promise((resolve, reject) => {
        const url = `${getRelativeUrl('ExtractionSetupDialog.html')}?sheets=${encodeURIComponent(
            JSON.stringify(sheetNames),
        )}&current=${encodeURIComponent(currentSheet || '')}`;
        Office.context.ui.displayDialogAsync(
            url,
            { height: 35, width: 30, displayInIframe: true },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(result.error);
                } else {
                    const dialog = result.value;
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        (arg) => {
                            if ('error' in arg) {
                                dialog.close();
                                reject(arg.error);
                                return;
                            }
                            try {
                                const msg = JSON.parse(arg.message);
                                dialog.close();
                                if (msg.cancelled) return resolve(null);
                                resolve({
                                    sheetName: msg.sheetName ?? null,
                                    hasHeader: !!msg.hasHeader,
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

