import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import { Type } from 'js-yaml';
export function getTag(name: string, value: any): Type {
    const types: Array<Type & {
        tag: string;
    }> = CLOUDFORMATION_SCHEMA.explicit;
    const tag = types.filter(t => t.tag === `!${name}`)[0];
    if (!tag) {
        throw new Error(`Could not find tag called ${name}`);
    }
    return tag.construct(value);
}
