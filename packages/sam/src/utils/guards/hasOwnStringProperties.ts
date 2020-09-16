import { hasOwnProperties } from './hasOwnProperties';

export function hasOwnStringProperties<K extends string, OK extends string>(
    keys: K[],
    optionalKeys: OK[],
    object: unknown
): object is Record<K, string> & Record<OK, string | undefined> {
    if (!hasOwnProperties(keys, optionalKeys, object)) {
        return false;
    }
    const mandatory = keys.every((key) => typeof key === 'string');
    if (!mandatory) {
        return false;
    }
    return (
        optionalKeys.length === 0 ||
        optionalKeys.every(
            (key) => typeof key === 'undefined' || typeof key === 'string'
        )
    );
}
