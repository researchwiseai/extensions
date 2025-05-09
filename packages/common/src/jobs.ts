export interface FeedItem {
    jobId: string;
    createdAt: number;
    updatedAt: number;
    title: string;
    status: 'completed' | 'failed' | 'in-progress' | 'waiting';
    message?: string;
}

const feedItems = new Map<string, FeedItem>();

export function clear() {
    feedItems.clear();
}

export function createItem({
    jobId,
    title,
    message,
    status = 'waiting',
}: {
    jobId?: string;
    title: string;
    message?: string;
    status?: 'waiting' | 'in-progress';
}): FeedItem {
    if (!jobId) {
        jobId = crypto.randomUUID();
    }

    const item: FeedItem = {
        jobId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title,
        status,
        message,
    };
    feedItems.set(jobId, item);
    return item;
}

export function updateItem({
    jobId,
    status,
    message,
    title,
}: {
    jobId: string;
    status?: Exclude<FeedItem['status'], 'waiting' | 'in-progress'>;
    message?: string;
    title?: string;
}) {
    const item = feedItems.get(jobId);
    if (!item) {
        throw new Error(`Feed item not found: ${jobId}`);
    }
    if (status) {
        item.status = status;
    } else if (item.status === 'waiting') {
        item.status = 'in-progress';
    }
    if (message) {
        item.message = message;
    }
    if (title) {
        item.title = title;
    }
    item.updatedAt = Date.now();

    feedItems.set(jobId, item);
    return item;
}

export function getFeed(): FeedItem[] {
    return Array.from(feedItems.values()).sort(
        (a, b) => a.createdAt - b.createdAt,
    );
}
