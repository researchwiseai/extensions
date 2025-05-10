export function getRelativeUrl(url: string): string {
    return [
        window.location.origin,
        '/',
        process.env.NODE_ENV === 'production' ? 'extensions/' : '',
        url,
    ].join('');
}
