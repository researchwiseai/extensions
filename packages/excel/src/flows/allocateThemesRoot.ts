import { getThemeSets } from 'pulse-common/themes';
import { allocateThemesAutomaticFlow } from './allocateThemesAutomatic';
import { allocateThemesFromSetFlow } from './allocateThemesFromSet';

interface AutomaticMode {
    mode: 'automatic';
}

interface SetMode {
    mode: 'set';
    setName: string;
}
type AllocationMode = AutomaticMode | SetMode;

function openAllocationModeDialog(
    themeSetNames: string[],
    resolve: (value: AllocationMode) => void,
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
                        () =>
                            openAllocationModeDialog(
                                themeSetNames,
                                resolve,
                                reject,
                            ),
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
                            console.log('Dialog message received', arg);
                            const msg = JSON.parse(
                                arg.message,
                            ) as AllocationMode;
                            dialog.close();
                            resolve(msg);
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
) {
    const themeSets = await getThemeSets();
    const themeSetNames = themeSets.map((set) => set.name);

    const themeSetOrigin = await new Promise<AllocationMode>(
        (resolve, reject) => {
            openAllocationModeDialog(themeSetNames, resolve, reject);
        },
    );

    console.log('Theme set origin', themeSetOrigin);

    if (themeSetOrigin.mode === 'automatic') {
        await allocateThemesAutomaticFlow(context, range);
    } else {
        await allocateThemesFromSetFlow(context, range, themeSetOrigin.setName);
    }
}
