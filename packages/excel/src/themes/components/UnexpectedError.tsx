import { useMemo, useState } from 'react';

function buildCopyText(payload: any) {
    const lines: string[] = [];
    lines.push('Pulse Excel Add-in error report');
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
    return lines.join('\n');
}

export function UnexpectedError({ payload }: { payload: any }) {
    const copyText = useMemo(() => buildCopyText(payload), [payload]);
    const [copied, setCopied] = useState(false);
    const close = () => {
        try {
            Office.context.ui.messageParent(JSON.stringify({ type: 'close' }));
        } catch {}
    };
    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(copyText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };
    return (
        <div className="flex flex-col gap-5" role="alert" aria-live="assertive">
            <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-full bg-red-100 text-red-700 w-9 h-9 flex items-center justify-center text-lg">!</div>
                <div>
                    <h2 className="text-2xl font-semibold">Sorry — something went wrong</h2>
                    {payload?.kind === 'validation' ? (
                        <p className="mt-1 text-slate-700">
                            {String(payload.errorMessage || 'There was a problem with your selection. Please check your range and try again.')}
                        </p>
                    ) : (
                        <p className="mt-1 text-slate-700">
                            We hit an unexpected error. Please email our team and we’ll sort it out.
                            If this cost you credits, we can put them back — just mention it in your email.
                        </p>
                    )}
                    {payload?.errorMessage ? (
                        <p className="mt-2 text-sm text-slate-600">
                            Error: <span className="italic">{String(payload.errorMessage)}</span>
                        </p>
                    ) : null}
                </div>
            </div>
            {payload?.kind !== 'validation' ? (
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-slate-700">
                        Email: support@researchwiseai.com
                    </div>
                    <textarea
                        readOnly
                        value={copyText}
                        className="w-full h-32 p-2 border border-slate-300 rounded"
                    />
                    <div className="flex gap-2">
                        <button onClick={onCopy} className="pulse-btn pulse-btn--primary">
                            {copied ? 'Copied' : 'Copy details'}
                        </button>
                        <button
                            onClick={close}
                            className="pulse-btn pulse-btn--secondary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button onClick={close} className="pulse-btn pulse-btn--secondary">
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
