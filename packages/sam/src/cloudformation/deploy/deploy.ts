import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { underscore } from '@angular-devkit/core/src/utils/strings';
import { runCloudformationCommand } from '../run-cloudformation-command';
import { loadCloudFormationTemplate } from '../../utils/load-cloud-formation-template';

type Capability =
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
     *
     */
    stackName: string | null;
    /**
     * todo: should update this type to show it can be this OR stackName, not both
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
}

export interface IParameterOverrides {
    [key: string]: string;
}

export interface IFinalDeployOptions extends IDeployOptions {
    parameterOverrides: IParameterOverrides;
    noFailOnEmptyChangeset: boolean;
}

try {
    require('dotenv').config();
} catch (e) {}

export default createBuilder<IDeployOptions>((options, context) => {
    const finalOptions: IFinalDeployOptions = {
        ...options,
        noFailOnEmptyChangeset: true,
        parameterOverrides: getParameterOverrides(options)
    };
    if (finalOptions.stackNameFormat) {
        finalOptions.stackName = normalize(finalOptions.stackNameFormat)[0].toLowerCase();
        delete finalOptions.stackNameFormat;
    }
    return runCloudformationCommand(finalOptions, context, 'deploy');
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

// todo: extract this into its own little module
function normalize(...args: any[]) {
    return args.map(function(arg) {
        Object.keys(process.env)
            .sort((a, b) => b.length - a.length) // sort by descending length to prevent partial replacement
            .forEach(key => {
                const regex = new RegExp(`\\$${key}|%${key}%`, 'ig');
                arg = arg.replace(regex, process.env[key]);
            });
        return arg;
    });
}
