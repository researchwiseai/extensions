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
// Deprecated: old extraction dialog removed
import { promptExtractionSetup } from '../services/promptExtractionSetup';
import { promptDictionaryEditor } from '../services/promptDictionaryEditor';
import { readThemesFromSheet } from '../services/readThemesFromSheet';
import { saveThemesToSheet as saveThemesToSheetSvc } from '../services/saveThemesToSheet';
import type { Theme } from 'pulse-common';
import { extractElementsFromWorksheet } from '../extractElements';
import { getThemeSets } from 'pulse-common/themes';
import { saveThemeExtractionsToSheet } from '../services/saveThemeExtractionsToSheet';
import { extractThemes } from 'pulse-common/api';
// Feature flagging removed
import { promptSummarizeOptions } from '../services/promptSummarizeOptions';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { summarizeFlow } from '../flows/summarizeFlow';
import { withPulseAuth } from '../services/authGuard';
import * as Sentry from "@sentry/react";
import { restorePulseAuthFromStorage } from '../services/pulseAuth';

restorePulseAuthFromStorage();

// Initialize Sentry with HTTP/network breadcrumbs and performance tracing enabled
Sentry.init({
  dsn: "https://f3c182e7744b0c06066f1021bfa85a25@o4505908303167488.ingest.us.sentry.io/4509984779796480",
  integrations: [
    // Capture fetch/XHR as breadcrumbs and performance spans
    Sentry.browserTracingIntegration(),
    Sentry.breadcrumbsIntegration({ console: true, dom: true, fetch: true, xhr: true }),
  ],
  // Sample some percentage of transactions; adjust as needed
  tracesSampleRate: 1.0,
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

function toFriendlyValidationMessage(message: string | undefined): string | undefined {
    if (!message) return undefined;
    const m = message.toLowerCase();
    if (m.includes('at least 1 element')) {
        return 'No usable inputs found in the selected range. Please select a single column with at least one non-empty cell and try again.';
    }
    if (m.includes('single column range')) {
        return 'Please select exactly one column, not multiple.';
    }
    if (m.includes('no text found')) {
        return 'We could not find any text in your selection. Select a column with text and try again.';
    }
    return undefined;
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

        const rawMessage = (error as any)?.message || String(error);
        const friendly = toFriendlyValidationMessage(String(rawMessage));
        await showUnexpectedErrorModal({
            eventId,
            correlationId: extra?.correlationId,
            dateTime,
            userId,
            orgId,
            errorMessage: friendly ?? rawMessage,
            kind: friendly ? 'validation' : 'unexpected',
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

// Extractions handler: select sheet + header, preview/edit dictionary, then run
async function runExtractionsHandler(event: any) {
    console.log('Run extractions handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        // 1) Gather worksheet names and active sheet
        const { sheetNames, active } = await Excel.run(async (context) => {
            const worksheets = context.workbook.worksheets;
            worksheets.load('items/name');
            const activeSheet = worksheets.getActiveWorksheet();
            activeSheet.load('name');
            await context.sync();
            return {
                sheetNames: worksheets.items.map((ws) => ws.name),
                active: activeSheet.name,
            };
        });

        // 2) Prompt for sheet + header
        const setup = await promptExtractionSetup(sheetNames, active);
        if (!setup) return; // cancelled

        // 3) Inspect the chosen sheet to count inputs and seed dictionary (if header)
        const { inputsCount, initialDict } = await Excel.run(async (context) => {
            const sheet = setup.sheetName
                ? context.workbook.worksheets.getItem(setup.sheetName)
                : context.workbook.worksheets.getActiveWorksheet();
            const used = sheet.getUsedRange();
            used.load(['values', 'rowCount', 'columnCount']);
            await context.sync();
            const values: any[][] = used.values as any[][];
            const rowCount = used.rowCount;
            const colCount = used.columnCount;
            let count = 0;
            for (let r = 0; r < rowCount; r++) {
                const v = values[r]?.[0];
                const t = (v == null ? '' : String(v)).trim();
                if (t) count += 1;
            }
            if (setup.hasHeader && count > 0) count -= 1;
            const init: string[] = [];
            if (setup.hasHeader && colCount >= 2 && rowCount >= 1) {
                const header = values[0] || [];
                for (let c = 1; c < colCount; c++) {
                    const term = String(header[c] ?? '').trim();
                    if (term) init.push(term);
                }
            }
            return { inputsCount: count, initialDict: init };
        });

        // 4) Prompt user to edit dictionary (require at least 3 terms)
        const edited = await promptDictionaryEditor(
            initialDict,
            inputsCount,
            true,
            async (draft) => {
                // Check if any data in write region (columns B+ for data rows) would be overwritten
                return await Excel.run(async (context) => {
                    const sheet = setup.sheetName
                        ? context.workbook.worksheets.getItem(setup.sheetName)
                        : context.workbook.worksheets.getActiveWorksheet();
                    const used = sheet.getUsedRange();
                    used.load(['values', 'rowCount', 'columnCount', 'rowIndex', 'columnIndex']);
                    await context.sync();
                    const values: any[][] = used.values as any[][];
                    const rowCount = used.rowCount;
                    const colCount = used.columnCount;
                    const hasHeader = !!setup.hasHeader;
                    const startRow = hasHeader ? 1 : 0;
                    let anyExisting = false;
                    for (let r = startRow; r < rowCount; r++) {
                        const a = (values[r]?.[0] ?? '').toString().trim();
                        if (!a) continue; // only consider rows with an input in col A
                        for (let c = 1; c < colCount; c++) {
                            const v = values[r]?.[c];
                            const t = (v == null ? '' : String(v)).trim();
                            if (t) {
                                anyExisting = true;
                                break;
                            }
                        }
                        if (anyExisting) break;
                    }
                    // If any existing content found, return false to trigger inline confirmation
                    return !anyExisting;
                });
            },
        );
        if (!edited) return; // cancelled

        openFeedHandler(); // keep credits/taskpane visible and active
        // 5) Run extraction and writeback
        await extractElementsFromWorksheet({
            sheetName: setup.sheetName,
            hasHeader: setup.hasHeader,
            dictionary: edited.dictionary,
            expandDictionary: !!edited.expand,
        });
    }).catch((e) => {
        console.error('Extractions dialog error', e);
        reportUnexpectedError(e);
    });
}
Office.actions.associate('runExtractionsHandler', runExtractionsHandler);

// Theme Extractions handler: choose theme set source (auto/set/sheet) then run theme-mode extractions
async function runThemeExtractionsHandler(event: any) {
    console.log('Run theme extractions handler');
    try {
        event?.completed?.();
    } catch {}
    withPulseAuth(async () => {
        return Excel.run(async (context) => {
            // 1) Confirm range and header
            const { range: confirmed, hasHeader } = await confirmRange(context);
            if (confirmed === null) {
                console.log('User cancelled the dialog');
                return;
            }

            // 2) Collect sheet names for the theme-set source picker
            const worksheets = context.workbook.worksheets;
            worksheets.load('items/name');
            await context.sync();
            const sheetNames = worksheets.items.map((ws) => ws.name);

            // 3) Prompt for theme set source (automatic / saved set / worksheet)
            const themeSets = await getThemeSets();
            const themeSetNames = themeSets.map((s) => s.name);

            const url = getRelativeUrl(
                `AllocationModeDialog.html?sets=${encodeURIComponent(
                    JSON.stringify(themeSetNames),
                )}&sheets=${encodeURIComponent(JSON.stringify(sheetNames))}`,
            );
            type Mode =
                | { mode: 'automatic' }
                | { mode: 'set'; setName: string }
                | { mode: 'sheet'; sheetName: string };
            const mode = await new Promise<Mode | null>((resolve, reject) => {
                Office.context.ui.displayDialogAsync(
                    url,
                    { height: 60, width: 40, displayInIframe: true },
                    (result) => {
                        if (result.status !== Office.AsyncResultStatus.Succeeded) {
                            reject(result.error);
                            return;
                        }
                        const dialog = result.value;
                        const onMsg = (arg: any) => {
                            if ('error' in arg) {
                                try {
                                    dialog.close();
                                } catch {}
                                reject(arg.error);
                                return;
                            }
                            try {
                                const payload = JSON.parse(arg.message || '{}');
                                if (payload && payload.mode) {
                                    try {
                                        dialog.close();
                                    } catch {}
                                    resolve(payload as Mode);
                                }
                            } catch (e) {
                                try {
                                    dialog.close();
                                } catch {}
                                reject(e);
                            }
                        };
                        dialog.addEventHandler(
                            Office.EventType.DialogMessageReceived,
                            onMsg,
                        );
                    },
                );
            });
            if (!mode || !mode.mode) return;

            // 4) Resolve theme labels based on chosen mode
            let themeLabels: string[] = [];
            if (mode.mode === 'automatic') {
                const gen = await themeGenerationFlow(
                    context,
                    confirmed,
                    hasHeader,
                    Date.now(),
                );
                if (!gen || !gen.themes) return;
                themeLabels = (gen.themes as any[])
                    .map((t) => String(t.label || '').trim())
                    .filter(Boolean);
            } else if (mode.mode === 'set') {
                const set = themeSets.find((s) => s.name === mode.setName);
                if (!set) return;
                themeLabels = set.themes
                    .map((t) => String((t as any).label || '').trim())
                    .filter(Boolean);
            } else {
                const themes = await readThemesFromSheet(mode.sheetName);
                themeLabels = (themes as any[])
                    .map((t) => String(t.label || '').trim())
                    .filter(Boolean);
            }
            if (themeLabels.length === 0) {
                throw new Error('No themes available. Please provide a theme set.');
            }

            // 5) Gather inputs from the confirmed range
            const { inputs: rawInputs, rangeInfo, sheet } =
                await getSheetInputsAndPositions(context, confirmed);
            let inputs = rawInputs;
            let headerText = 'Text';
            if (hasHeader) {
                const headerCell = sheet.getRangeByIndexes(
                    rangeInfo.rowIndex,
                    rangeInfo.columnIndex,
                    1,
                    1,
                );
                headerCell.load('values');
                await context.sync();
                headerText = String(headerCell.values[0][0] ?? '').trim() || 'Text';
                inputs = rawInputs.slice(1);
            }
            if (inputs.length === 0) {
                throw new Error('No input texts found in the selected range.');
            }

            openFeedHandler();
            // 6) Run theme-mode extractions and save to a new sheet
            const result = await extractThemes(inputs, themeLabels, {
                fast: false,
                onProgress: (m) => console.log('[ThemeExtractions][progress]', m),
            });

            console.log('[ThemeExtractions] Response received', {
                inputsLength: inputs.length,
                labelsLength: (result.dictionary ?? themeLabels).length,
                resultsLength: Array.isArray(result.results)
                    ? result.results.length
                    : -1,
            });

            console.log('[ThemeExtractions] Writing results to sheet...');
            await saveThemeExtractionsToSheet({
                context,
                inputs,
                headerText,
                labels: result.dictionary ?? themeLabels,
                results: result.results,
            });
            console.log('[ThemeExtractions] Finished writing results to sheet.');
        });
    }).catch((e) => {
        console.error('Theme extractions dialog error', e);
        reportUnexpectedError(e);
    });
}
Office.actions.associate('runThemeExtractionsHandler', runThemeExtractionsHandler);

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
