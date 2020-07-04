import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import Template from 'cloudform-types/types/template';
import {
    GlobalsTemplate,
} from '@nx-aws/cloudformation-sam-types';

export function loadCloudFormationTemplate(templatePath: string): Template & GlobalsTemplate  {
    const yaml = readFileSync(templatePath, { encoding: 'utf-8' });
    const cf: Template & GlobalsTemplate = load(yaml, {
        schema: CLOUDFORMATION_SCHEMA,
    });
    return cf;
}
