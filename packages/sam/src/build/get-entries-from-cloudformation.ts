import Resource from 'cloudform-types/types/resource';
import { resolve, parse, join } from 'path';
import { loadCloudFormationTemplate } from '../utils/load-cloud-formation-template';
import { ExtendedBuildBuilderOptions } from './build';
/**
 * Read the cloudformation template yaml, and use it to identify our input files.
 */
export function getEntriesFromCloudformation(
    options: ExtendedBuildBuilderOptions
): string[] {
    const cf = loadCloudFormationTemplate(options.template);
    const resources = cf.Resources;
    if (!resources) {
        throw new Error("Cloudformation template didn't contain any resources");
    }
    const functions: Resource[] = [];
    Object.keys(resources).forEach(name => {
        if (resources[name].Type === 'AWS::Serverless::Function') {
            functions.push(resources[name]);
        }
    });
    if (functions.length === 0) {
        throw new Error(
            "Cloudformation template didn't contain any AWS::Serverless::Function's"
        );
    }
    const { dir } = parse(options.template);
    const handlers = functions
        .filter(
            (
                fn
            ): fn is Resource & {
                Properties: {
                    [key: string]: any;
                };
            } => !!fn.Properties
        )
        .map(fn => {
            const codeUri: string = fn.Properties.CodeUri;
            const handler: string = fn.Properties.Handler;
            const handlerParts = handler.split('.');
            handlerParts.pop();
            const fileName = [...handlerParts, 'ts'].join('.');
            const filePath = join(codeUri, fileName);
            const src = resolve(dir, filePath);
            return src;
        });

    return handlers;
}
