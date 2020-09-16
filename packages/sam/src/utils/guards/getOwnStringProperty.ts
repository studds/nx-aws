import { hasOwnStringProperties } from './hasOwnStringProperties';

export function getOwnStringProperty<K extends string>(
    key: K,
    object: unknown
): string {
    if (!hasOwnStringProperties([key], [], object)) {
        throw new Error(
            `Exepected object to have a string at key ${key} but it did not`
        );
    }
    return object[key];
}
