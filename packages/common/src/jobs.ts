export interface FeedItem {
    jobId: string;
    createdAt: number;
    updatedAt: number;
    title: string;
    status: 'completed' | 'failed' | 'in-progress' | 'waiting';
    message?: string;
    sheetName?: string;
    /** Optional callback invoked when the feed item is clicked */
    onClick?: () => void;
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
    sheetName,
    onClick,
}: {
    jobId?: string;
    title: string;
    message?: string;
    status?: 'waiting' | 'in-progress';
    sheetName?: string;
    onClick?: () => void;
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
        sheetName,
        onClick,
    };
    feedItems.set(jobId, item);
    return item;
}

export function updateItem({
    jobId,
    status,
    message,
    title,
    sheetName,
    onClick,
}: {
    jobId: string;
    status?: Exclude<FeedItem['status'], 'waiting' | 'in-progress'>;
    message?: string;
    title?: string;
    sheetName?: string;
    onClick?: () => void;
}) {
    console.log(
        'Updating feed item:',
        jobId,
        status,
        message,
        title,
        sheetName,
    );

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
    if (sheetName) {
        item.sheetName = sheetName;
    }
    if (onClick) {
        item.onClick = onClick;
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

export function getItem(jobId: string): FeedItem | undefined {
    return feedItems.get(jobId);
}
