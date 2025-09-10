import { getRelativeUrl } from './relativeUrl';

export type DictionaryEditorResult = {
    dictionary: string[];
    expand: boolean;
};

export function promptDictionaryEditor(
    initial: string[],
    inputsCount: number,
    expandDefault = true,
    checkOverwrite?: (draft: DictionaryEditorResult) => Promise<boolean>,
): Promise<DictionaryEditorResult | null> {
    return new Promise((resolve, reject) => {
        const url = `${getRelativeUrl('ExtractionDictionaryDialog.html')}?initial=${encodeURIComponent(
            JSON.stringify(initial),
        )}&inputs=${encodeURIComponent(String(inputsCount))}&expand=${encodeURIComponent(
            String(!!expandDefault),
        )}`;
        Office.context.ui.displayDialogAsync(
            url,
            { height: 60, width: 35, displayInIframe: true },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(result.error);
                } else {
                    const dialog = result.value;
                    let pendingDraft: DictionaryEditorResult | null = null;
                    const handle = async (arg: any) => {
                        if ('error' in arg) {
                            dialog.close();
                            reject(arg.error);
                            return;
                        }
                        try {
                            const msg = JSON.parse(arg.message);
                            if (msg.cancelled) {
                                dialog.close();
                                resolve(null);
                                return;
                            }
                            if (msg && msg.type === 'confirm-overwrite') {
                                // User confirmed after our warning
                                if (pendingDraft) {
                                    dialog.close();
                                    resolve(pendingDraft);
                                } else {
                                    dialog.close();
                                    resolve(null);
                                }
                                return;
                            }
                            const isSubmit = msg?.type === 'submit' || Array.isArray(msg?.dictionary);
                            if (isSubmit) {
                                const draft: DictionaryEditorResult = {
                                    dictionary: Array.isArray(msg.dictionary)
                                        ? msg.dictionary
                                        : [],
                                    expand: !!msg.expand,
                                };
                                if (checkOverwrite) {
                                    try {
                                        const ok = await checkOverwrite(draft);
                                        if (ok) {
                                            dialog.close();
                                            resolve(draft);
                                        } else {
                                            pendingDraft = draft;
                                            try {
                                                dialog.messageChild(
                                                    JSON.stringify({ type: 'confirm-overwrite' }),
                                                );
                                            } catch (e) {
                                                dialog.close();
                                                resolve(draft);
                                            }
                                        }
                                    } catch (e) {
                                        dialog.close();
                                        reject(e);
                                    }
                                } else {
                                    dialog.close();
                                    resolve(draft);
                                }
                            }
                        } catch (e) {
                            dialog.close();
                            reject(e);
                        }
                    };
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        handle,
                    );
                }
            },
        );
    });
}
