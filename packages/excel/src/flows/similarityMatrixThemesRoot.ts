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

interface SheetMode {
    mode: 'sheet';
    sheetName: string;
}

type AllocationMode = AutomaticMode | SetMode | SheetMode;

function openAllocationModeDialog(
    themeSetNames: string[],
    sheetNames: string[],
    resolve: (value: AllocationMode) => void,
    reject: (reason?: any) => void,
) {
    console.log('Opening matrix mode dialog');
    const url = getRelativeUrl(
        `AllocationModeDialog.html?sets=${encodeURIComponent(
            JSON.stringify(themeSetNames.reverse()),
        )}&sheets=${encodeURIComponent(JSON.stringify(sheetNames))}`,
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
                                sheetNames,
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

    const worksheets = context.workbook.worksheets;
    worksheets.load('items/name');
    await context.sync();
    const sheetNames = worksheets.items.map((ws) => ws.name);

    const allocationMode = await new Promise<AllocationMode>(
        (resolve, reject) => {
            openAllocationModeDialog(
                themeSetNames,
                sheetNames,
                resolve,
                reject,
            );
        },
    );

    if (allocationMode.mode === 'automatic') {
        await similarityMatrixThemesAutomaticFlow(context, range);
    } else if (allocationMode.mode === 'set') {
        await similarityMatrixThemesFromSetFlow(
            context,
            range,
            allocationMode.setName,
        );
    } else {
        await similarityMatrixThemesFromSetFlow(
            context,
            range,
            allocationMode.sheetName,
        );
    }
}
