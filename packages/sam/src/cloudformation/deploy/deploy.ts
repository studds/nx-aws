import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { underscore } from '@angular-devkit/core/src/utils/strings';
import { runCloudformationCommand } from '../run-cloudformation-command';
import { loadCloudFormationTemplate } from '../../utils/load-cloud-formation-template';
import { formatStackName } from './formatStackName';
import { OutputValueRetriever } from './OutputValueRetriever';
import { CloudFormationDeployOptions } from './CloudFormationDeployOptions';

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
    importStackOutputs: { [key: string]: string } | null;
}

export interface IParameterOverrides {
    [key: string]: string;
}

try {
    require('dotenv').config();
} catch (e) {}

export default createBuilder<IDeployOptions>(async (options, context) => {
    const {
        capabilities,
        importStackOutputs,
        region,
        s3Bucket,
        s3Prefix,
        templateFile
    } = options;

    const project = context.target && context.target.project;
    if (!project) {
        throw new Error(`Could not find project name for target`);
    }
    const stackName = formatStackName(project).toLowerCase();
    if (importStackOutputs) {
        const outputValueRetriever = new OutputValueRetriever();
        // retrieve the values from the other projects
        const values = await outputValueRetriever.getOutputValues(
            importStackOutputs,
            context
        );
        // and export them as environment variables, ready to be picked up if they match
        // any input parameters
        process.env = { ...values, ...process.env };
    }

    const parameterOverrides = getParameterOverrides(options);

    const cfOptions: CloudFormationDeployOptions = {
        capabilities,
        noFailOnEmptyChangeset: true,
        parameterOverrides,
        s3Bucket,
        stackName,
        templateFile,
        s3Prefix,
        region
    };
    return runCloudformationCommand(cfOptions, context, 'deploy');
});

function getParameterOverrides(options: IDeployOptions): IParameterOverrides {
    const cf = loadCloudFormationTemplate(options.templateFile);
    const parameters = cf.Parameters;
    if (!parameters) {
        return {};
    }
    const overrides: IParameterOverrides = {};
    for (const key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            const envKey = underscore(key).toUpperCase();
            const value = process.env[envKey];
            if (value) {
                overrides[key] = value;
            }
        }
    }
    return overrides;
}
