import { getThemeSets } from 'pulse-common/themes';
import { similarityMatrixThemesFromSetFlow } from './similarityMatrixThemesFromSet';
import { similarityMatrixThemesAutomaticFlow } from './similarityMatrixThemesAutomatic';
import { getRelativeUrl } from '../services/relativeUrl';

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
    console.log('Opening matrix mode dialog');
    const url = getRelativeUrl(
        `AllocationModeDialog.html?sets=${encodeURIComponent(
            JSON.stringify(themeSetNames.reverse()),
        )}`,
    );
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

export async function similarityMatrixThemesRootFlow(
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

    if (themeSetOrigin.mode === 'automatic') {
        await similarityMatrixThemesAutomaticFlow(context, range);
    } else {
        await similarityMatrixThemesFromSetFlow(
            context,
            range,
            themeSetOrigin.setName,
        );
    }
}
