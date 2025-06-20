"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clear = clear;
exports.createItem = createItem;
exports.updateItem = updateItem;
exports.getFeed = getFeed;
const feedItems = new Map();
function clear() {
    feedItems.clear();
}
function createItem({ jobId, title, message, status = 'waiting', }) {
    if (!jobId) {
        jobId = crypto.randomUUID();
    }
    const item = {
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
function updateItem({ jobId, status, message, title, }) {
    const item = feedItems.get(jobId);
    if (!item) {
        throw new Error(`Feed item not found: ${jobId}`);
    }
    if (status) {
        item.status = status;
    }
    else if (item.status === 'waiting') {
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
function getFeed() {
    return Array.from(feedItems.values()).sort((a, b) => a.createdAt - b.createdAt);
}
