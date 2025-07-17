import { analyzeSentiment } from '../analyzeSentiment';
import { themeGenerationFlow } from '../flows/themeGenerationFlow';
import { confirmRange } from '../services/promptRange';
import { allocateThemesRoot } from '../flows/allocateThemesRoot';
import { matrixThemesRootFlow } from '../flows/matrixThemesRoot';
import { splitIntoSentencesFlow } from '../flows/splitIntoSentences';
import { similarityMatrixThemesRootFlow } from '../flows/similarityMatrixThemesRoot';
import { splitIntoTokensFlow } from '../flows/splitIntoTokens';
import { countWordsFlow } from '../flows/countWords';
import { openFeedHandler } from '../taskpane/Taskpane';
import { modalApi } from '../modal/api';
import { getRelativeUrl } from '../services/relativeUrl';

function analyzeSentimentHandler(event: any) {
    Excel.run(async (context) => {
        try {
            const confirmed = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await analyzeSentiment(context, confirmed);
        } catch (e) {
            console.error('Dialog error', e);
            console.error((e as Error).stack);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate('analyzeSentimentHandler', analyzeSentimentHandler);

async function generateThemesHandler(event: any) {
    Excel.run(async (context) => {
        try {
            const confirmed = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await themeGenerationFlow(context, confirmed, Date.now());
        } catch (e) {
            console.error('Dialog error', e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate('generateThemesHandler', generateThemesHandler);

function allocateThemesHandler(event: any) {
    console.log('Allocate themes handler');
    Excel.run(async (context) => {
        try {
            const confirmed = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await allocateThemesRoot(context, confirmed);
        } catch (e) {
            console.error('Dialog error', e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate('allocateThemesHandler', allocateThemesHandler);

function matrixThemesHandler(event: any) {
    console.log('Matrix themes handler');

    Excel.run(async (context) => {
        try {
            const confirmed = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await matrixThemesRootFlow(context, confirmed);
        } catch (e) {
            console.error('Dialog error', e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate('matrixThemesHandler', matrixThemesHandler);

function similarityMatrixThemesHandler(event: any) {
    console.log('Similarity matrix themes handler');
    Excel.run(async (context) => {
        try {
            const confirmed = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await similarityMatrixThemesRootFlow(context, confirmed);
        } catch (e) {
            console.error('Dialog error', e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate(
    'similarityMatrixThemesHandler',
    similarityMatrixThemesHandler,
);

function splitIntoSentencesHandler(event: any) {
    console.log('Split into sentences handler');
    Excel.run(async (context) => {
        try {
            const selectedRange = context.workbook.getSelectedRange();
            selectedRange.load('address');
            await context.sync();
            console.log('Selected range', selectedRange.address);
            event.completed();

            await splitIntoSentencesFlow(context, selectedRange.address);
        } catch (e) {
            console.error('Dialog error', e);
            console.error((e as Error).stack);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate(
    'splitIntoSentencesHandler',
    splitIntoSentencesHandler,
);
// Handler for splitting text into tokens using wink-nlp
function splitIntoTokensHandler(event: any) {
    console.log('Split into tokens handler');
    Excel.run(async (context) => {
        try {
            const selectedRange = context.workbook.getSelectedRange();
            selectedRange.load('address');
            await context.sync();
            console.log('Selected range', selectedRange.address);
            event.completed();

            await splitIntoTokensFlow(context, selectedRange.address);
        } catch (e) {
            console.error('Token split error', e);
            console.error((e as Error).stack);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate('splitIntoTokensHandler', splitIntoTokensHandler);
// Handler for counting words using wink-nlp
function countWordsHandler(event: any) {
    console.log('Count words handler');
    Excel.run(async (context) => {
        try {
            const selectedRange = context.workbook.getSelectedRange();
            selectedRange.load('address');
            await context.sync();
            console.log('Selected range', selectedRange.address);
            event.completed();

            await countWordsFlow(context, selectedRange.address);
        } catch (e) {
            console.error('Word count error', e);
            console.error((e as Error).stack);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
    });
}
Office.actions.associate('countWordsHandler', countWordsHandler);

function manageThemesHandler() {}
Office.actions.associate('manageThemesHandler', manageThemesHandler);

interface CanComplete {
    completed: () => void;
}
function canComplete(event: unknown): event is CanComplete {
    return (
        typeof event === 'object' &&
        event !== null &&
        'completed' in event &&
        typeof (event as CanComplete).completed === 'function'
    );
}

let dialog: Promise<unknown> | null = null;

function _dialog() {
    return new Promise((resolve, reject) => {
        const url = getRelativeUrl('Modal.html');
        Office.context.ui.displayDialogAsync(
            url,
            { height: 60, width: 50, displayInIframe: true },
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
    }).then((result) => {
        dialog = null;
    });
}

function openDialog() {
    if (dialog) {
        return dialog;
    }
    dialog = _dialog();
    return dialog;
}

async function toggleThemeSetManager(event?: unknown) {
    console.log('Toggle theme set manager');
    openDialog();
    modalApi.goToView('themeSets');
    if (canComplete(event)) {
        event.completed();
    }
}
console.log('Associating toggleThemeSetManager');
Office.actions.associate('toggleThemeSetManager', toggleThemeSetManager);
