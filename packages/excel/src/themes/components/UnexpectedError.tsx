import { useMemo } from 'react';

function buildMailtoLink(payload: any) {
    const to = 'support@researchwiseai.com';
    const subject = encodeURIComponent('Pulse Excel Add-in error report');

    const lines: string[] = [];
    lines.push('Hi ResearchWise AI Support,');
    lines.push('');
    lines.push('I encountered an unexpected error in the Pulse Excel add-in.');
    lines.push('Please find details below:');
    lines.push('');
    if (payload?.eventId) lines.push(`eventId: ${payload.eventId}`);
    if (payload?.correlationId) lines.push(`correlationId: ${payload.correlationId}`);
    if (payload?.dateTime) lines.push(`time: ${payload.dateTime}`);
    if (payload?.userId) lines.push(`user: ${payload.userId}`);
    if (payload?.orgId) lines.push(`org: ${payload.orgId}`);
    if (payload?.errorMessage) lines.push(`message: ${payload.errorMessage}`);
    if (payload?.location) lines.push(`location: ${payload.location}`);
    if (payload?.extra) {
        try {
            lines.push('');
            lines.push('Extra:');
            lines.push(JSON.stringify(payload.extra));
        } catch {}
    }
    lines.push('');
    lines.push('Thanks!');

    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function UnexpectedError({ payload }: { payload: any }) {
    const mailto = useMemo(() => buildMailtoLink(payload), [payload]);
    const close = () => {
        try {
            Office.context.ui.messageParent(JSON.stringify({ type: 'close' }));
        } catch {}
    };
    return (
        <div className="flex flex-col gap-5" role="alert" aria-live="assertive">
            <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-full bg-red-100 text-red-700 w-9 h-9 flex items-center justify-center text-lg">!</div>
                <div>
                    <h2 className="text-2xl font-semibold">Sorry — something went wrong</h2>
                    <p className="mt-1 text-slate-700">
                        We hit an unexpected error. Please email our team and we’ll sort it out.
                        If this cost you credits, we can put them back — just mention it in your email.
                    </p>
                    {payload?.errorMessage ? (
                        <p className="mt-2 text-sm text-slate-600">
                            Error: <span className="italic">{String(payload.errorMessage)}</span>
                        </p>
                    ) : null}
                </div>
            </div>
            <div className="flex gap-2">
                <a
                    href={mailto}
                    onClick={(e) => {
                        e.preventDefault();
                        try {
                            Office.context.ui.messageParent(
                                JSON.stringify({ type: 'open-mailto', href: mailto }),
                            );
                        } catch {}
                        setTimeout(close, 50);
                    }}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                    Email support
                </a>
                <button
                    onClick={close}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
