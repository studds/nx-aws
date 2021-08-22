import Resource from 'cloudform-types/types/resource';
import { resolve, relative } from 'path';
import { ExtendedBuildBuilderOptions } from './build';
import { Entry } from 'webpack';
import { getLambdaSourcePath } from '../../utils/getLambdaSourcePath';
import {
    Globals,
    ParsedSamTemplate,
} from '../../utils/load-cloud-formation-template';

/**
 * Read the CloudFormation template yaml, and use it to identify our input files.
 */
export function getEntriesFromCloudFormation(
    options: ExtendedBuildBuilderOptions,
    cf: ParsedSamTemplate
): Array<Entry> {
    const globals = cf.Globals;
    const resources = cf.Resources;
    if (!resources) {
        throw new Error("CloudFormation template didn't contain any resources");
    }
    return Object.keys(resources)
        .map((name) => {
            return getEntry(name, resources[name], options, globals);
        })
        .filter((s): s is Entry => !!s);
}

function getEntry(
    resourceName: string,
    resource: Resource,
    options: ExtendedBuildBuilderOptions,
    globalProperties?: Globals
): Entry | undefined {
    const properties = resource.Properties;
    if (!properties) {
        return;
    }

    // we add source-map-install to all entries - it's nice to get mapped error messages
    // from your lambdas

    const srcMapInstall = resolve(__dirname, 'source-map-install.js');
    if (resource.Type === 'AWS::Serverless::Function') {
        return getEntryForFunction(
            resourceName,
            properties,
            options,
            srcMapInstall,
            globalProperties?.Function
        );
    } else {
        return;
    }
}
function getEntryForFunction(
    resourceName: string,
    properties: { [key: string]: any },
    options: ExtendedBuildBuilderOptions,
    srcMapInstall: string,
    globalProperties?: { [key: string]: any }
) {
    const { src, dir } = getLambdaSourcePath(
        options.template,
        resourceName,
        properties,
        globalProperties
    );
    const entryName = relative(dir, src).replace('.ts', '');
    return { [entryName]: [srcMapInstall, src] };
}
