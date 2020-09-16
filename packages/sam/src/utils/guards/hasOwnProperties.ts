export function hasOwnProperties<K extends string, OK extends string>(
    keys: K[],
    _optionalKeys: OK[],
    object: unknown
): object is Record<K | OK, unknown> {
    if (typeof object !== 'object' || !object) {
        return false;
    }
    return keys.every((key) =>
        Object.prototype.hasOwnProperty.call(object, key)
    );
}
