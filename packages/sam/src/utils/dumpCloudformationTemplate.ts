import { dump } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import { ParsedSamTemplate } from './load-cloud-formation-template';

export function dumpCloudformationTemplate(
    cloudFormation: ParsedSamTemplate
): string {
    return dump(cloudFormation, { schema: CLOUDFORMATION_SCHEMA });
}
