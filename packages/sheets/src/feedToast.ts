import { getFeed, updateItem } from 'pulse-common/jobs';

export function feedToast(message: string) {
    // Update the most recent feed item with a progress message
    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({ jobId: last.jobId, message });
    }
}
