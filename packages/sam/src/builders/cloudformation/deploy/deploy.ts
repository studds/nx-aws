import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runCloudformationCommand } from '../run-cloudformation-command';
import { CloudFormationDeployOptions } from './CloudFormationDeployOptions';
import { ImportStackOutputs, formatStackName } from '@nx-aws/core';
import { IParameterOverrides } from './IParameterOverrides';
import { getParameterOverrides } from '../../../utils/getParameterOverrides';

export type Capability =
    | 'CAPABILITY_IAM'
    | 'CAPABILITY_NAMED_IAM'
    | 'CAPABILITY_AUTO_EXPAND';

// todo: allow overriding some / all of these with environment variables
interface IDeployOptions extends JsonObject {
    /**
     * The path where your AWS CloudFormation template is located.
     */
    templateFile: string;
    /**
     * Only set internally - not a valid option
     */
    stackName: string | null;
    /**
     *
     */
    stackNameFormat: string | null;
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
    /**
     * A list of capabilities that you must specify before AWS Cloudformation can create certain stacks.
     * Some stack templates might include resources that can affect permissions in your AWS account,
     * for example, by creating new AWS Identity and Access Management (IAM) users. For those stacks,
     * you must explicitly acknowledge their capabilities by specifying this parameter. The only valid
     * values are CAPABILITY_IAM and CAPABILITY_NAMED_IAM. If you have IAM resources, you can specify
     * either capability. If you have IAM resources with custom names, you must specify CAPABILITY_NAMED_IAM.
     * If you don't specify this parameter, this action returns an InsufficientCapabilities error.
     */
    capabilities: Capability[] | null;
    /**
     * the region to deploy this stack
     */
    region: string | null;
    importStackOutputs: (ImportStackOutputs & JsonObject) | null;
    parameterOverrides: IParameterOverrides | null;
    stackSuffix: string | null;
}

try {
    require('dotenv').config();
} catch (e) {}

export default createBuilder<IDeployOptions>(async (options, context) => {
    const { capabilities, region, s3Bucket, s3Prefix, templateFile } = options;

    const stackSuffix = options.stackSuffix || undefined;

    const project = context.target && context.target.project;
    if (!project) {
        throw new Error(`Could not find project name for target`);
    }
    const stackName = formatStackName(
        project,
        undefined,
        stackSuffix
    ).toLowerCase();

    const parameterOverrides = await getParameterOverrides(
        options,
        context,
        stackSuffix
    );

    const cfOptions: CloudFormationDeployOptions = {
        capabilities,
        noFailOnEmptyChangeset: true,
        parameterOverrides,
        s3Bucket,
        stackName,
        templateFile,
        s3Prefix,
        region,
    };
    return runCloudformationCommand(cfOptions, context, 'deploy');
});
