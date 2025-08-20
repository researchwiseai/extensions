import { summarize as summarizeApi } from 'pulse-common/api';
import type { SummarizePreset } from 'pulse-common/summarize';
import { getSheetInputsAndPositions } from '../services/getSheetInputsAndPositions';
import { showSummaryDialog } from '../services/showSummaryDialog';
import { getFeed, updateItem } from 'pulse-common/jobs';

export async function summarizeFlow(
    context: Excel.RequestContext,
    range: string,
    hasHeader: boolean,
    {
        question,
        preset,
    }: { question: string | null; preset: SummarizePreset | null },
) {
    const startTime = Date.now();
    const {
        sheet,
        inputs: rawInputs,
        positions: rawPositions,
        rangeInfo,
    } = await getSheetInputsAndPositions(context, range);

    let inputs = rawInputs;
    let positions = rawPositions;
    if (hasHeader) {
        // Skip header row
        inputs = rawInputs.slice(1);
        positions = rawPositions.slice(1);
    }

    // Auto-enable fast mode for fewer than 200 non-blank inputs (after header removal),
    // mirroring sentiment behavior.
    const useFast = false;

    const { summary } = await summarizeApi(inputs, {
        fast: useFast,
        question: question ?? undefined,
        preset: preset ?? undefined,
        onProgress: (m) => console.log(m),
    });

    await showSummaryDialog(summary);

    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({
            jobId: last.jobId,
            onClick: () => {
                // No sheet to navigate to; keep as no-op for now
                console.log('Summary ready');
            },
        });
    }
}
