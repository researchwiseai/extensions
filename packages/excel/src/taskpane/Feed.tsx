import { useState } from 'react';
import { TaskpaneApi } from './api';
import { useEffect } from 'react';
import { FeedItem, getFeed } from 'pulse-common/jobs';

interface Props {
    api: TaskpaneApi;
}

export function Feed({ api }: Props) {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [visibleFeed, setVisibleFeed] = useState<FeedItem[]>([]);

    useEffect(() => {
        const fetchFeed = () => {
            const data = getFeed();
            setFeed(data.sort((a, b) => a.createdAt - b.createdAt));
        };

        fetchFeed();

        const interval = setInterval(fetchFeed, 500); // Refresh feed every .5 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const newVisibleFeed = feed.filter((item) => {
                const now = Date.now();
                return (
                    item.status === 'waiting' ||
                    item.status === 'in-progress' ||
                    now - item.updatedAt <= 3 * 60 * 1000
                );
            });
            setVisibleFeed(newVisibleFeed);
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: FeedItem['status']) => {
        switch (status) {
            case 'completed':
                return 'border-green-500';
            case 'failed':
                return 'border-red-500';
            case 'in-progress':
                return 'border-purple-500';
            case 'waiting':
                return 'border-gray-500';
            default:
                return 'border-gray-500';
        }
    };

    return (
        <div className="bg-[#f3f2f1]">
            <div className="w-full">
                <h2 className="ms-font-su">Feed</h2>
                <div className="space-y-4">
                    {feed.map((item) => {
                        const clickable = Boolean(item.onClick);
                        return (
                            <div
                                key={item.jobId}
                                onClick={clickable ? item.onClick : undefined}
                                className={`p-4 border-l-4 ${getStatusColor(item.status)} bg-white shadow-sm ${clickable ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold">{item.title}</h3>
                                    {item.onClick && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                item.onClick?.();
                                            }}
                                            className="text-blue-600 underline"
                                        >
                                            Open
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600">
                                    {item.message}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
