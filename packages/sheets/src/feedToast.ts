import { getFeed, updateItem } from 'pulse-common/jobs';

export function feedToast(message: string) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast(message, 'Pulse');
    const feed = getFeed();
    const last = feed[feed.length - 1];
    if (last) {
        updateItem({ jobId: last.jobId, message });
    }
}
