export function hasOwnProperty<K extends string>(
    key: K,
    object: unknown
): object is Record<K, unknown> {
    if (typeof object !== 'object' || !object) {
        return false;
    }
    return Object.prototype.hasOwnProperty.call(object, key);
}
