import { getRelativeUrl } from './relativeUrl';
import type { SummarizePreset } from 'pulse-common/summarize';

export type SummarizeOptionsInput = {
    question: string | null;
    preset: SummarizePreset | null;
};

export function promptSummarizeOptions(
    defaultQuestion?: string,
): Promise<SummarizeOptionsInput> {
    return new Promise((resolve, reject) => {
        const url = getRelativeUrl(
            `SummarizeOptionsDialog.html${
                defaultQuestion
                    ? `?defaultQuestion=${encodeURIComponent(defaultQuestion)}`
                    : ''
            }`,
        );

        function open() {
            Office.context.ui.displayDialogAsync(
                url,
                { height: 50, width: 35, displayInIframe: true },
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Failed) {
                        // Retry once if a dialog is still closing
                        if ((result.error as any)?.code === 12007) {
                            setTimeout(open, 100);
                        } else {
                            reject(result.error);
                        }
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
                                        question: msg.question ?? null,
                                        preset: msg.preset ?? null,
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
        }

        open();
    });
}
