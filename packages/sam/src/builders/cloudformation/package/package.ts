import { createBuilder, BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runCloudformationCommand } from '../run-cloudformation-command';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { writeFileSync } from 'fs';
import { getFinalTemplateLocation } from '../get-final-template-location';
import { loadCloudFormationTemplate } from '../../../utils/load-cloud-formation-template';
import { dumpCloudformationTemplate } from '../../../utils/dumpCloudformationTemplate';
import { updateCloudFormationTemplate } from './updateCloudFormationTemplate';

// todo: allow overriding some / all of these with environment variables
export interface IPackageOptions extends JsonObject {
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config();
} catch (e) {
    // ignore any error
}

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
