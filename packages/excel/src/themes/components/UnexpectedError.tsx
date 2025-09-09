import { useMemo } from 'react';

function buildMailtoLink(payload: any) {
    const to = 'support@researchwiseai.com';
    const subjectParts = [
        'Pulse Excel Add-in Unexpected Error',
        payload?.eventId ? `(${payload.eventId})` : undefined,
    ].filter(Boolean);
    const subject = encodeURIComponent(subjectParts.join(' '));

    const lines: string[] = [];
    lines.push('Hi ResearchWise AI Support,');
    lines.push('');
    lines.push('I encountered an unexpected error in the Pulse Excel add-in.');
    lines.push('Please find details below:');
    lines.push('');
    if (payload?.eventId) lines.push(`Sentry Event ID: ${payload.eventId}`);
    if (payload?.correlationId)
        lines.push(`Correlation ID: ${payload.correlationId}`);
    if (payload?.dateTime) lines.push(`Date/Time: ${payload.dateTime}`);
    if (payload?.userId) lines.push(`User: ${payload.userId}`);
    if (payload?.orgId) lines.push(`Organization: ${payload.orgId}`);
    if (payload?.errorMessage) lines.push(`Error: ${payload.errorMessage}`);
    if (payload?.location) lines.push(`Location: ${payload.location}`);
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
    return (
        <div className="flex flex-col gap-4" role="alert" aria-live="assertive">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p>
                An unexpected error occurred. You can email our support team
                with the pre-filled details below. Including the Sentry ID and
                context helps us resolve the issue faster.
            </p>
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {payload?.errorMessage ? (
                    <div>
                        <span className="font-medium">Error:</span>{' '}
                        <span>{String(payload.errorMessage)}</span>
                    </div>
                ) : null}
                {payload?.eventId ? (
                    <div>
                        <span className="font-medium">Sentry ID:</span>{' '}
                        <code>{payload.eventId}</code>
                    </div>
                ) : null}
                {payload?.correlationId ? (
                    <div>
                        <span className="font-medium">Correlation ID:</span>{' '}
                        <code>{payload.correlationId}</code>
                    </div>
                ) : null}
                {payload?.dateTime ? (
                    <div>
                        <span className="font-medium">Date/Time:</span>{' '}
                        <span>{payload.dateTime}</span>
                    </div>
                ) : null}
                {payload?.userId ? (
                    <div>
                        <span className="font-medium">User:</span>{' '}
                        <span>{payload.userId}</span>
                    </div>
                ) : null}
                {payload?.orgId ? (
                    <div>
                        <span className="font-medium">Organization:</span>{' '}
                        <span>{payload.orgId}</span>
                    </div>
                ) : null}
            </div>
            <div className="flex gap-2">
                <a
                    href={mailto}
                    className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                    Email support
                </a>
            </div>
        </div>
    );
}

