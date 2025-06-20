export interface FeedItem {
    jobId: string;
    createdAt: number;
    updatedAt: number;
    title: string;
    status: 'completed' | 'failed' | 'in-progress' | 'waiting';
    message?: string;
}
export declare function clear(): void;
export declare function createItem({ jobId, title, message, status, }: {
    jobId?: string;
    title: string;
    message?: string;
    status?: 'waiting' | 'in-progress';
}): FeedItem;
export declare function updateItem({ jobId, status, message, title, }: {
    jobId: string;
    status?: Exclude<FeedItem['status'], 'waiting' | 'in-progress'>;
    message?: string;
    title?: string;
}): FeedItem;
export declare function getFeed(): FeedItem[];
