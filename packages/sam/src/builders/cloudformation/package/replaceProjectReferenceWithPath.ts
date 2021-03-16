import { BuilderContext } from '@angular-devkit/architect';
import Template from 'cloudform-types/types/template';
import Resource from 'cloudform-types/types/resource';
import { getFinalTemplateLocation } from '../get-final-template-location';
import { isContentfulString } from './isContentfulString';

/**
 *
 * We allow AWS::Serverless::Application resources to point to an nx project instead of a file path.
 *
 * This is probably a bad idea, but it is convenient.
 *
 * @param cloudFormation
 * @param context
 */
export async function replaceProjectReferenceWithPath(
    cloudFormation: Template,
    context: BuilderContext
): Promise<void> {
    const resources = cloudFormation.Resources;
    if (resources) {
        for (const key in resources) {
            if (Object.prototype.hasOwnProperty.call(resources, key)) {
                const resource = resources[key];
                if (resource.Type === 'AWS::Serverless::Application') {
                    await updateTemplate(resource, context, key);
                }
            }
        }
    }
}

async function updateTemplate(
    resource: Resource,
    context: BuilderContext,
    key: string
): Promise<void> {
    const properties = resource.Properties;
    if (properties) {
        const location = properties.Location;
        try {
            const applicationOptions = await context.getTargetOptions({
                project: location,
                target: 'package',
            });
            const outputTemplateFile = applicationOptions.outputTemplateFile;
            const templateFile = applicationOptions.templateFile;
            if (
                isContentfulString(outputTemplateFile) &&
                isContentfulString(templateFile)
            ) {
                // we map the location to the
                const finalTemplateLocation = getFinalTemplateLocation(
                    outputTemplateFile,
                    templateFile
                );
                context.logger.info(
                    `Remapping ${key} location to ${finalTemplateLocation} for referenced project ${location}`
                );
                properties.Location = finalTemplateLocation;
            }
        } catch (err) {
            // ignore error - it's not a project reference
        }
    }
}
