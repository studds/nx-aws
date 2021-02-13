export function isContentfulString(s: unknown): s is string {
    return typeof s === 'string' && !!s;
}
