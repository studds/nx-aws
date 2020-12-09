import { hasOwnStringProperties } from './hasOwnStringProperties';

export function getOwnStringProperties<K extends string, O extends string>({
    keys,
    optionalKeys = [],
    object,
}: {
    keys: K[];
    optionalKeys?: O[];
    object: unknown;
}): { [key in K]: string } & { [key in O]?: string } {
    if (!hasOwnStringProperties(keys, optionalKeys, object)) {
        throw new Error(
            `Exepected object to have a string at key ${keys.join(
                ', '
            )} but it did not`
        );
    }
    return object;
}
