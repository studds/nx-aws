import { createBuilder, BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runCloudformationCommand } from '../run-cloudformation-command';
import Template from 'cloudform-types/types/template';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { writeFileSync } from 'fs';
import Resource from 'cloudform-types/types/resource';
import { getFinalTemplateLocation } from '../get-final-template-location';
import { parse } from 'path';
import { mapRelativePathsToAbsolute } from './mapRelativePathsToAbsolute';
import { loadCloudFormationTemplate } from '../../../utils/load-cloud-formation-template';
import { dumpCloudformationTemplate } from '../../../utils/dumpCloudformationTemplate';

// todo: allow overriding some / all of these with environment variables
interface IPackageOptions extends JsonObject {
    /**
     * The path where your AWS CloudFormation template is located.
     */
    templateFile: string;
    /**
     *
     */
    outputTemplateFile: string;
    /**
     *
     * The name of the S3 bucket where this command uploads the artefacts that are referenced in your template.
     */
    s3Bucket: string;
    /**
     *  A prefix name that the command adds to the artefacts' name when it uploads them to the S3 bucket. The
     *  prefix name is a path name (folder name) for the S3 bucket.
     */
    s3Prefix: string | null;
    /**
     * If true, we skip the aws package command, which is unnecessary for a sub stack
     */
    subStackOnly: boolean;
    /**
     * The region to upload resources
     */
    region: string | null;
}

try {
    require('dotenv').config();
} catch (e) {}

export default createBuilder<IPackageOptions>(
    (options: IPackageOptions, context: BuilderContext) => {
        const cloudFormation = loadCloudFormationTemplate(options.templateFile);
        return from(
            updateCloudFormationTemplate(cloudFormation, context, options)
        ).pipe(
            switchMap(async () => {
                const updatedTemplateFile = getFinalTemplateLocation(
                    options.outputTemplateFile,
                    options.templateFile
                );
                // todo: why are we rewriting this?
                options.templateFile = updatedTemplateFile;
                writeFileSync(
                    updatedTemplateFile,
                    dumpCloudformationTemplate(cloudFormation),
                    {
                        encoding: 'utf-8',
                    }
                );
                if (options.subStackOnly) {
                    // if this is a sub-stack only, we don't need to run package, as the aws cli already
                    // handles nested stacks.
                    return { success: true };
                }
                // todo: probably should use nrwl's command builder (whatever that's called?)
                return runCloudformationCommand(options, context, 'package');
            })
        );
    }
);
async function updateCloudFormationTemplate(
    cloudFormation: Template,
    context: BuilderContext,
    options: IPackageOptions
) {
    await resolveSubStacks(cloudFormation, context);
    const inputPath = parse(options.templateFile).dir;
    mapRelativePathsToAbsolute(cloudFormation, inputPath);
}
async function resolveSubStacks(
    cloudFormation: Template,
    context: BuilderContext
) {
    const resources = cloudFormation.Resources;
    if (resources) {
        for (const key in resources) {
            if (resources.hasOwnProperty(key)) {
                const resource = resources[key];
                if (resource.Type === 'AWS::Serverless::Application') {
                    await resolveSubStackTemplateLocation(
                        resource,
                        context,
                        key
                    );
                }
            }
        }
    }
}

async function resolveSubStackTemplateLocation(
    resource: Resource,
    context: BuilderContext,
    key: string
) {
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

function isContentfulString(s: any): s is string {
    return typeof s === 'string' && !!s;
}
