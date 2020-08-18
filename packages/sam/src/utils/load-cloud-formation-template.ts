import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import Template from 'cloudform-types/types/template';

/**
 * Partial list of supported properties for the Globals property
 * @since 0.7.0
 */
export interface Globals {
    Function?: Function;
}

/**
 * Partial list of supported values the Function attribute of the Globals property
 *
 * @since 0.7.0
 */
export interface Function {
    Handler?: string;
    CodeUri?:
        | string
        | {
              Bucket: string;
              Key: string;
              Version: string;
          };
}

export function loadCloudFormationTemplate(
    templatePath: string
): Template & { Globals: Globals } {
    const yaml = readFileSync(templatePath, { encoding: 'utf-8' });
    const cf: Template & { Globals: Globals } = load(yaml, {
        schema: CLOUDFORMATION_SCHEMA,
    });
    return cf;
}
