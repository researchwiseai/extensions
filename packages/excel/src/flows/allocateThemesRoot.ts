import { getThemeSets } from 'pulse-common/themes';

function openDialog(
    themeSetNames: string[],
    resolve: (value: string | null) => void,
    reject: (reason?: any) => void,
) {
    console.log('Opening allocation mode dialog');
    const url = `${window.location.origin}/AllocationModeDialog.html?sets=${encodeURIComponent(
        JSON.stringify(themeSetNames),
    )}`;
    Office.context.ui.displayDialogAsync(
        url,
        { height: 60, width: 40, displayInIframe: true },
        (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
                if (result.error.code === 12007) {
                    setTimeout(
                        () => openDialog(themeSetNames, resolve, reject),
                        100,
                    );
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
}

export async function allocateThemesRoot(
    context: Excel.RequestContext,
    range: string,
): Promise<string | null> {
    const themeSets = await getThemeSets();
    const themeSetNames = themeSets.map((set) => set.name);

    return await new Promise((resolve, reject) => {
        openDialog(themeSetNames, resolve, reject);
    });
}
