import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runCloudformationCommand } from '../run-cloudformation-command';

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

export default createBuilder<IPackageOptions>((options, context) => {
    return runCloudformationCommand(options, context, 'package');
});
