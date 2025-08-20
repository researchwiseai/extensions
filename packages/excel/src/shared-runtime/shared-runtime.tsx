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
import { promptExtractionOptions } from '../services/promptExtractionOptions';
import { extractElementsFromActiveWorksheet } from '../extractElements';
import { promptSummarizeOptions } from '../services/promptSummarizeOptions';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { summarizeFlow } from '../flows/summarizeFlow';

function analyzeSentimentHandler(event: any) {
    Excel.run(async (context) => {
        try {
            const { range: confirmed, hasHeader } = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await analyzeSentiment(context, confirmed, hasHeader);
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
            const { range: confirmed, hasHeader: _hasHeader } =
                await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await themeGenerationFlow(
                context,
                confirmed,
                _hasHeader,
                Date.now(),
            );
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
            const { range: confirmed, hasHeader: _hasHeader } =
                await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await allocateThemesRoot(context, confirmed, _hasHeader);
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
            const { range: confirmed, hasHeader: _hasHeader } =
                await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await matrixThemesRootFlow(context, confirmed, _hasHeader);
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
            const { range: confirmed, hasHeader } = await confirmRange(context);
            event.completed();

            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            openFeedHandler();
            await similarityMatrixThemesRootFlow(context, confirmed, hasHeader);
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

// Extractions handler: prompts for category and expansion, then runs extraction flow
async function runExtractionsHandler(event: any) {
    console.log('Run extractions handler');
    try {
        const { category, expand } = await promptExtractionOptions();
        event.completed();
        if (!category) {
            console.log('User cancelled extractions dialog or empty category');
            return;
        }
        openFeedHandler();
        await extractElementsFromActiveWorksheet(category, !!expand);
    } catch (e) {
        console.error('Extractions dialog error', e);
    } finally {
        if (event && typeof event.completed === 'function') {
            try { event.completed(); } catch {}
        }
    }
}
Office.actions.associate('runExtractionsHandler', runExtractionsHandler);

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

function summarizeHandler(event: any) {
    Excel.run(async (context) => {
        try {
            const { range: confirmed, hasHeader } = await confirmRange(context);
            if (confirmed === null) {
                canComplete(event) && event.completed();
                return;
            }
            // If user indicated header, seed a descriptive default question based on the header
            let defaultQuestion: string | undefined = undefined;
            if (hasHeader) {
                try {
                    const { sheet, rangeInfo } = await getSheetInputsAndPositions(
                        context,
                        confirmed,
                    );
                    const headerCell = sheet.getRangeByIndexes(
                        rangeInfo.rowIndex,
                        rangeInfo.columnIndex,
                        1,
                        1,
                    );
                    headerCell.load('values');
                    await context.sync();
                    const headerText = String(headerCell.values[0][0] ?? '').trim();
                    if (headerText) {
                        defaultQuestion = `Given the column header "${headerText}", what does this data tell us? Please summarize the key insights, trends, and any notable outliers.`;
                    }
                } catch (e) {
                    console.warn('Could not load header cell for default question', e);
                }
            }

            const { question, preset } = await promptSummarizeOptions(
                defaultQuestion,
            );
            canComplete(event) && event.completed();
            if (!question || !preset) {
                return; // cancelled or incomplete
            }
            openFeedHandler();
            await summarizeFlow(context, confirmed, hasHeader, {
                question,
                preset,
            });
        } catch (e) {
            console.error('Summarize error', e);
        } finally {
            canComplete(event) && event.completed();
        }
    }).catch((err) => console.error(err));
}
Office.actions.associate('summarizeHandler', summarizeHandler);

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
