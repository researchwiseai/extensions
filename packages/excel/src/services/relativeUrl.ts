export function getRelativeUrl(url: string): string {
    const isProduction =
        typeof process !== 'undefined' &&
        process.env?.NODE_ENV === 'production';
    return [
        window.location.origin,
        '/',
        isProduction ? 'extensions/' : '',
        url,
    ].join('');
}
