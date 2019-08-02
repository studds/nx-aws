import { BuildBuilderOptions } from '@nrwl/node/src/utils/types';
import Resource from 'cloudform-types/types/resource';
import { resolve, parse, join, relative } from 'path';
import { loadCloudFormationTemplate } from '../utils/load-cloud-formation-template';
/**
 * Read the cloudformation template yaml, and use it to identify our input files.
 */
export function getEntriesFromCloudformation(
    options: BuildBuilderOptions
): {
    [name: string]: string[];
} {
    const cf = loadCloudFormationTemplate(options.main);
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
    const { dir } = parse(options.main);
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
            // pop function name
            // todo: need to get the parts after source...

            handlerParts.pop();
            const fileName = [...handlerParts, 'ts'].join('.');
            const filePath = join(codeUri, fileName);
            const src = resolve(dir, filePath);
            const name = relative(options.sourceRoot || dir, src).replace(
                '.ts',
                ''
            );
            console.log('working in dir', options.sourceRoot);
            console.log('Final name', name);
            return { src, name };
        });
    const entries: {
        [name: string]: string[];
    } = {};

    const srcMapInstall = resolve(__dirname, 'source-map-install.js');

    handlers.map(handler => {
        const { name, src } = handler;
        entries[name] = [srcMapInstall, src];
    });
    return entries;
}
