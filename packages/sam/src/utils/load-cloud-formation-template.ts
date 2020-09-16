import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import Template from 'cloudform-types/types/template';

/**
 * Partial list of supported properties for the Globals property
 * @since 0.7.0
 */
export interface Globals {
    Function?: FunctionResource;
}

/**
 * Partial list of supported values the Function attribute of the Globals property
 *
 * @since 0.7.0
 */
export interface FunctionResource {
    Handler?: string;
    CodeUri?:
        | string
        | {
              Bucket: string;
              Key: string;
              Version: string;
          };
}

export type ParsedSamTemplate = Template & {
    Globals: Globals;
};

export function loadCloudFormationTemplate(
    templatePath: string
): ParsedSamTemplate {
    const yaml = readFileSync(templatePath, { encoding: 'utf-8' });
    const cf: ParsedSamTemplate = parseCloudFormationTemplate(yaml);
    return cf;
}

export function parseCloudFormationTemplate(yaml: string): ParsedSamTemplate {
    return load(yaml, {
        schema: CLOUDFORMATION_SCHEMA,
    });
}
