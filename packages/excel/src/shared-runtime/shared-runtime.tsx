import '../styles/tailwind.css';

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
import { getRelativeUrl } from '../services/relativeUrl';
import { promptExtractionOptions } from '../services/promptExtractionOptions';
import { readThemesFromSheet } from '../services/readThemesFromSheet';
import { saveThemesToSheet as saveThemesToSheetSvc } from '../services/saveThemesToSheet';
import type { Theme } from 'pulse-common';
import { extractElementsFromActiveWorksheet } from '../extractElements';
// Feature flagging removed
import { promptSummarizeOptions } from '../services/promptSummarizeOptions';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { summarizeFlow } from '../flows/summarizeFlow';
import { withPulseAuth } from '../services/authGuard';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://f3c182e7744b0c06066f1021bfa85a25@o4505908303167488.ingest.us.sentry.io/4509984779796480",
});

// Catch truly unexpected errors and surface a helpful modal
window.addEventListener('error', (evt) => {
    try {
        reportUnexpectedError((evt as any)?.error ?? evt?.message ?? evt);
    } catch {}
});
window.addEventListener('unhandledrejection', (evt) => {
    try {
        reportUnexpectedError((evt as any)?.reason ?? evt);
    } catch {}
});

async function showUnexpectedErrorModal(payload: any) {
    try {
        const url = getRelativeUrl('Modal.html');
        Office.context.ui.displayDialogAsync(
            url,
            { height: 60, width: 60, displayInIframe: true },
            (res) => {
                if (res.status !== Office.AsyncResultStatus.Succeeded) {
                    console.error('Failed to open error modal', res.error);
                    return;
                }
                const dlg = res.value;
                const onMsg = (arg: any) => {
                    try {
                        const msg = JSON.parse(arg.message || '{}');
                        if (msg && msg.type === 'ready') {
                            try {
                                dlg.messageChild(
                                    JSON.stringify({
                                        type: 'unexpected-error',
                                        payload,
                                    }),
                                );
                            } catch (e) {
                                console.error('Failed to send error payload', e);
                            }
                        } else if (msg && msg.type === 'open-mailto' && typeof msg.href === 'string') {
                            try {
                                // Attempt to open using window.location to trigger handler
                                window.location.href = msg.href;
                            } catch (e) {
                                console.warn('Failed to open mailto from parent', e);
                            }
                        } else if (msg && msg.type === 'close') {
                            dlg.close();
                        }
                    } catch (e) {
                        console.error('Error modal message parse error', e);
                    }
                };
                dlg.addEventHandler(Office.EventType.DialogMessageReceived, onMsg);
            },
        );
    } catch (e) {
        console.error('Unexpected: could not show error modal', e);
    }
}

async function reportUnexpectedError(error: unknown, extra?: { correlationId?: string }) {
    try {
        const userId = sessionStorage.getItem('user-email') || undefined;
        const orgId = sessionStorage.getItem('org-id') || undefined;
        const dateTime = new Date().toISOString();
        let eventId: string | undefined;
        try {
            eventId = Sentry.captureException(error, {
                extra: {
                    correlationId: extra?.correlationId,
                    userId,
                    orgId,
                },
            }) as unknown as string | undefined;
        } catch (s) {
            console.warn('Sentry capture failed', s);
        }

        await showUnexpectedErrorModal({
            eventId,
            correlationId: extra?.correlationId,
            dateTime,
            userId,
            orgId,
            errorMessage: (error as any)?.message || String(error),
            location: 'shared-runtime',
        });
    } catch (e) {
        console.error('Failed to report unexpected error', e);
    }
}

function analyzeSentimentHandler(event: any) {
    console.log('Analyze sentiment handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        Excel.run(async (context) => {
            try {
                const { range: confirmed, hasHeader } =
                    await confirmRange(context);
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
                reportUnexpectedError(e);
            } finally {
                event.completed();
            }
        }).catch((err) => {
            console.error(err);
            reportUnexpectedError(err);
        });
    });
}
Office.actions.associate('analyzeSentimentHandler', analyzeSentimentHandler);

async function generateThemesHandler(event: any) {
    console.log('Generate themes handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        return Excel.run(async (context) => {
            try {
                const { range: confirmed, hasHeader: _hasHeader } =
                    await confirmRange(context);
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
                reportUnexpectedError(e);
            }
        });
    }).catch((err) => console.error(err));
}
Office.actions.associate('generateThemesHandler', generateThemesHandler);

function allocateThemesHandler(event: any) {
    console.log('Allocate themes handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        return Excel.run(async (context) => {
            try {
                const { range: confirmed, hasHeader: _hasHeader } =
                    await confirmRange(context);
                if (confirmed === null) {
                    console.log('User cancelled the dialog');
                    return;
                }
                openFeedHandler();
                await allocateThemesRoot(context, confirmed, _hasHeader);
            } catch (e) {
                console.error('Dialog error', e);
                reportUnexpectedError(e);
            }
        });
    }).catch((err) => console.error(err));
}
Office.actions.associate('allocateThemesHandler', allocateThemesHandler);

function matrixThemesHandler(event: any) {
    console.log('Matrix themes handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        return Excel.run(async (context) => {
            try {
                const { range: confirmed, hasHeader: _hasHeader } =
                    await confirmRange(context);
                if (confirmed === null) {
                    console.log('User cancelled the dialog');
                    return;
                }
                openFeedHandler();
                await matrixThemesRootFlow(context, confirmed, _hasHeader);
            } catch (e) {
                console.error('Dialog error', e);
                reportUnexpectedError(e);
            }
        });
    }).catch((err) => console.error(err));
}
Office.actions.associate('matrixThemesHandler', matrixThemesHandler);

function similarityMatrixThemesHandler(event: any) {
    console.log('Similarity matrix themes handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        return Excel.run(async (context) => {
            try {
                const { range: confirmed, hasHeader } =
                    await confirmRange(context);
                if (confirmed === null) {
                    console.log('User cancelled the dialog');
                    return;
                }
                openFeedHandler();
                await similarityMatrixThemesRootFlow(
                    context,
                    confirmed,
                    hasHeader,
                );
            } catch (e) {
                console.error('Dialog error', e);
                reportUnexpectedError(e);
            }
        });
    }).catch((err) => console.error(err));
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
            reportUnexpectedError(e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
        reportUnexpectedError(err);
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
            reportUnexpectedError(e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
        reportUnexpectedError(err);
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
            reportUnexpectedError(e);
        } finally {
            event.completed();
        }
    }).catch((err) => {
        console.error(err);
        reportUnexpectedError(err);
    });
}
Office.actions.associate('countWordsHandler', countWordsHandler);

function manageThemesHandler() {}
Office.actions.associate('manageThemesHandler', manageThemesHandler);

// Extractions handler: prompts for category and expansion, then runs extraction flow
async function runExtractionsHandler(event: any) {
    console.log('Run extractions handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        const { category, expand } = await promptExtractionOptions();
        if (!category) {
            console.log('User cancelled extractions dialog or empty category');
            return;
        }
        openFeedHandler();
        await extractElementsFromActiveWorksheet(category, !!expand);
    }).catch((e) => {
        console.error('Extractions dialog error', e);
        reportUnexpectedError(e);
    });
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
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        return Excel.run(async (context) => {
            try {
                const { range: confirmed, hasHeader } =
                    await confirmRange(context);
                if (confirmed === null) {
                    return;
                }
                // If user indicated header, seed a descriptive default question based on the header
                let defaultQuestion: string | undefined = undefined;
                if (hasHeader) {
                    try {
                        const { sheet, rangeInfo } =
                            await getSheetInputsAndPositions(
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
                        const headerText = String(
                            headerCell.values[0][0] ?? '',
                        ).trim();
                        if (headerText) {
                            defaultQuestion = `Given the column header "${headerText}", what does this data tell us? Please summarize the key insights, trends, and any notable outliers.`;
                        }
                    } catch (e) {
                        console.warn(
                            'Could not load header cell for default question',
                            e,
                        );
                    }
                }
                const { question, preset } =
                    await promptSummarizeOptions(defaultQuestion);
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
                reportUnexpectedError(e);
            }
        });
    }).catch((err) => console.error(err));
}
Office.actions.associate('summarizeHandler', summarizeHandler);

let dialog: Promise<unknown> | null = null;

function _dialog() {
    return new Promise((resolve, reject) => {
        let settled = false;
        const url = getRelativeUrl('Modal.html');
        Office.context.ui.displayDialogAsync(
            url,
            { height: 60, width: 50, displayInIframe: true },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    if (!settled) {
                        settled = true;
                        reject(result.error);
                    }
                } else {
                    const dialog = result.value;
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        (arg) => {
                            if ('error' in arg) {
                                console.error('Dialog error', arg.error);
                                try { dialog.close(); } catch {}
                                if (!settled) {
                                    settled = true;
                                    reject(arg.error);
                                }
                                return;
                            }
                            try {
                                const msg = JSON.parse(arg.message || '{}');
                                // Ignore initial ready pings from the modal; only close on explicit signals
                                if (msg && msg.type === 'ready') {
                                    // No-op: modal is ready; do not close
                                    return;
                                }
                                // Handle Theme Manager RPC from dialog
                                if (msg && msg.type === 'themes-sheet-status-request') {
                                    (async () => {
                                        try {
                                            let exists = false;
                                            let themes: Theme[] | null = null;
                                            await Excel.run(async (context) => {
                                                const item = context.workbook.worksheets.getItemOrNullObject('Themes');
                                                await context.sync();
                                                exists = !(item as any).isNullObject;
                                            });
                                            if (exists) {
                                                try {
                                                    const t = await readThemesFromSheet('Themes');
                                                    themes = (t as any[]).map((x) => ({
                                                        label: String(x.label || ''),
                                                        shortLabel: String((x as any).shortLabel || ''),
                                                        description: String((x as any).description || ''),
                                                        representatives: Array.isArray((x as any).representatives)
                                                            ? (x as any).representatives.map((r: any) => String(r))
                                                            : [],
                                                    })) as Theme[];
                                                } catch (e) {
                                                    themes = null;
                                                }
                                            }
                                            try {
                                                dialog.messageChild(
                                                    JSON.stringify({
                                                        type: 'themes-sheet-status-response',
                                                        exists,
                                                        themes,
                                                    }),
                                                );
                                            } catch {}
                                        } catch (e) {
                                            console.error('Status request failed', e);
                                        }
                                    })();
                                    return;
                                }
                                if (msg && msg.type === 'themes-sheet-create-template-request') {
                                    (async () => {
                                        try {
                                            const exampleThemes: Theme[] = [
                                                {
                                                    label: 'Customer Satisfaction',
                                                    shortLabel: 'Satisfaction',
                                                    description:
                                                        'Feedback related to overall satisfaction and experience.',
                                                    representatives: [
                                                        'very satisfied',
                                                        'happy with service',
                                                        'great experience',
                                                    ],
                                                },
                                                {
                                                    label: 'Product Quality',
                                                    shortLabel: 'Quality',
                                                    description:
                                                        'Issues or praise concerning quality and reliability.',
                                                    representatives: [
                                                        'defective',
                                                        'works as expected',
                                                        'durable',
                                                    ],
                                                },
                                                {
                                                    label: 'Pricing',
                                                    shortLabel: 'Price',
                                                    description:
                                                        'Comments about pricing, value for money, or discounts.',
                                                    representatives: [
                                                        'too expensive',
                                                        'good value',
                                                        'affordable',
                                                    ],
                                                },
                                            ];
                                            await Excel.run(async (context) => {
                                                await saveThemesToSheetSvc({ context, themes: exampleThemes });
                                                // Activate the Themes worksheet after creation
                                                try {
                                                    const sheet = context.workbook.worksheets.getItem('Themes');
                                                    sheet.activate();
                                                } catch {}
                                                await context.sync();
                                            });
                                            try {
                                                dialog.messageChild(
                                                    JSON.stringify({ type: 'themes-sheet-create-template-response', ok: true }),
                                                );
                                            } catch {}
                                            // Close the Theme Manager dialog upon successful creation
                                            try { dialog.close(); } catch {}
                                        } catch (e) {
                                            console.error('Create template failed', e);
                                            try {
                                                dialog.messageChild(
                                                    JSON.stringify({ type: 'themes-sheet-create-template-response', ok: false }),
                                                );
                                            } catch {}
                                        }
                                    })();
                                    return;
                                }
                                if (msg && msg.type === 'themes-sheet-read-request') {
                                    (async () => {
                                        try {
                                            const themes = await readThemesFromSheet('Themes');
                                            try {
                                                dialog.messageChild(
                                                    JSON.stringify({ type: 'themes-sheet-read-response', themes }),
                                                );
                                            } catch {}
                                        } catch (e) {
                                            console.error('Read themes request failed', e);
                                            try {
                                                dialog.messageChild(
                                                    JSON.stringify({ type: 'themes-sheet-read-response', error: true }),
                                                );
                                            } catch {}
                                        }
                                    })();
                                    return;
                                }
                                if (msg && msg.type === 'close') {
                                    try { dialog.close(); } catch {}
                                    if (!settled) {
                                        settled = true;
                                        resolve(undefined);
                                    }
                                    return;
                                }
                                // Back-compat: some dialogs may return a payload (e.g., a range)
                                if (msg && ("range" in msg || "payload" in msg)) {
                                    try { dialog.close(); } catch {}
                                    if (!settled) {
                                        settled = true;
                                        resolve((msg as any).range ?? (msg as any).payload);
                                    }
                                    return;
                                }
                                // Unknown message; ignore and keep dialog open
                                console.debug('Dialog message ignored', msg);
                            } catch (e) {
                                console.warn('Dialog message parse error; ignoring', e);
                            }
                        },
                    );
                    // Ensure we clear the open-dialog state if the dialog is closed by the host/UI
                    dialog.addEventHandler(
                        Office.EventType.DialogEventReceived,
                        () => {
                            try { dialog.close(); } catch {}
                            if (!settled) {
                                settled = true;
                                resolve(undefined);
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
    if (canComplete(event)) {
        event.completed();
    }
}
console.log('Associating toggleThemeSetManager');
Office.actions.associate('toggleThemeSetManager', toggleThemeSetManager);

// (Feature flagging removed)
