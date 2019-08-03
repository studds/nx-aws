import { createBuilder, BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runCloudformationCommand } from '../run-cloudformation-command';
import { sync as mkdirpSync } from 'mkdirp';
import { parse } from 'path';
import { loadCloudFormationTemplate } from '../../utils/load-cloud-formation-template';
import Template from 'cloudform-types/types/template';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { dump } from 'js-yaml';
import Resource from 'cloudform-types/types/resource';
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
     *  A prefix name that the command adds to the artifacts' name when it uploads them to the S3 bucket. The
     *  prefix name is a path name (folder name) for the S3 bucket.
     */
    s3Prefix: string | null;
}

try {
    require('dotenv').config();
} catch (e) {}

export default createBuilder<IPackageOptions>(
    (options: IPackageOptions, context: BuilderContext) => {
        const cloudFormation = loadCloudFormationTemplate(options.templateFile);
        return from(updateCloudFormationTemplate(cloudFormation, context)).pipe(
            switchMap(() => {
                const outputPath = parse(options.outputTemplateFile).dir;
                mkdirpSync(outputPath);
                const updatedTemplateFile = resolve(
                    outputPath,
                    parse(options.templateFile).base
                );
                options.templateFile = updatedTemplateFile;
                writeFileSync(updatedTemplateFile, dump(cloudFormation), {
                    encoding: 'utf-8'
                });
                // todo: probably should use nrwl's command builder (whatever that's called?)
                return runCloudformationCommand(options, context, 'package');
            })
        );
    }
);
async function updateCloudFormationTemplate(
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
        const applicationOptions = await context.getTargetOptions({
            project: location,
            target: 'package'
        });
        const outputTemplateFile = applicationOptions.outputTemplateFile;
        if (typeof outputTemplateFile === 'string' && outputTemplateFile) {
            const finalTemplateLocation = resolve(
                context.workspaceRoot,
                outputTemplateFile
            );
            context.logger.info(
                `Remapping ${key} location to ${finalTemplateLocation} for referenced project ${location}`
            );
            properties.Location = finalTemplateLocation;
        }
    }
}
