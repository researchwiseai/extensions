import { useState } from 'react';
import { TaskpaneApi } from './api';
import { useEffect } from 'react';
import { FeedItem, getFeed } from 'pulse-common/jobs';
import { getAccessToken } from 'pulse-common/auth';
import { getBaseUrl } from 'pulse-common/api';

interface Props {
    api: TaskpaneApi;
}

export function Feed({ api }: Props) {
    const DEBUG = true;
    const dlog = (...args: any[]) => {
        if (DEBUG) console.log('[Feed]', ...args);
    };
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [visibleFeed, setVisibleFeed] = useState<FeedItem[]>([]);
    const [credits, setCredits] = useState<{
        total: number;
        complimentaryActive: number;
    } | null>(null);

    useEffect(() => {
        dlog('Mount: start feed polling');
        const fetchFeed = () => {
            const data = getFeed();
            const sorted = data.sort((a, b) => a.createdAt - b.createdAt);
            setFeed(sorted);
        };

        fetchFeed();

        const interval = setInterval(fetchFeed, 500); // Refresh feed every .5 seconds
        return () => {
            dlog('Unmount: stop feed polling');
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        dlog('Mount: start visible feed filter');
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

        return () => {
            dlog('Unmount: stop visible feed filter');
            clearInterval(interval);
        };
    }, []);

    // Fetch organization credits once on mount
    useEffect(() => {
        const load = async () => {
            try {
                dlog('Credits: fetching token...');
                const token = await getAccessToken();
                const claims = token
                    ? JSON.parse(atob(token.split('.')[1]))
                    : null;
                dlog('Credits: token obtained?', token);
                if (!token) return;
                const endpoint = `${getBaseUrl()}/v1/credits/organizations/${claims?.org_id}`;
                dlog('Credits: fetching', endpoint);
                const resp = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    mode: 'cors',
                });
                dlog('Credits: response status', resp.status);
                if (!resp.ok) {
                    dlog('Credits: non-ok response, hiding footer');
                    return;
                }
                const data = await resp.json();
                dlog('Credits: raw json', data);
                const total = Number(data.total) || 0;
                const complimentaryActive =
                    Number(data.complimentaryActive) || 0;
                dlog('Credits: parsed totals', {
                    total,
                    complimentaryActive,
                });
                setCredits({ total, complimentaryActive });
            } catch (e) {
                // Silently ignore; footer will stay hidden
                console.warn('[Feed] Failed to load credits', e);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!credits) return;
        const complimentary = credits.complimentaryActive;
        const total = credits.total;
        const showProgress = complimentary > 0;
        const dollars = (showProgress ? complimentary : total) * 0.01;
        const pct = Math.max(0, Math.min(1, complimentary / 1000)) * 100;
        dlog('Credits: state changed', {
            complimentary,
            total,
            showProgress,
            dollars: dollars.toFixed(2),
            pct,
        });
    }, [credits]);

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

    const complimentary = credits?.complimentaryActive || 0;
    const total = credits?.total || 0;
    const showProgress = complimentary > 0;
    const dollars = (showProgress ? complimentary : total) * 0.01;
    const pct = Math.max(0, Math.min(1, complimentary / 1000)) * 100;

    return (
        <div className="bg-[#f3f2f1] m-5" style={{ paddingBottom: 64 }}>
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
            {/* Fixed footer for credits */}
            {credits && (
                <div
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: '#fff',
                        borderTop: '1px solid #ddd',
                        padding: '8px 12px',
                        boxShadow: '0 -1px 3px rgba(0,0,0,0.06)',
                    }}
                >
                    <div
                        style={{ color: '#444', fontWeight: 600, fontSize: 13 }}
                    >
                        ${dollars.toFixed(2)}{' '}
                        {showProgress ? 'free credits' : 'credits'}
                    </div>
                    {showProgress && (
                        <div
                            style={{
                                width: '100%',
                                height: 6,
                                background: '#eee',
                                borderRadius: 3,
                                marginTop: 6,
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: pct + '%',
                                    background: '#4caf50',
                                    transition: 'width 0.25s ease-in-out',
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
