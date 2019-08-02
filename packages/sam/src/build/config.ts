import { Configuration, Entry } from 'webpack';
import { BuildBuilderOptions } from '@nrwl/node/src/utils/types';
import { camelize } from '@angular-devkit/core/src/utils/strings';
import { dump } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import Resource from 'cloudform-types/types/resource';
import { sync as mkdirp } from 'mkdirp';
import { writeFileSync } from 'fs';
import { resolve, parse } from 'path';
import webpackMerge from 'webpack-merge';
import { loadCloudFormationTemplate } from '../utils/load-cloud-formation-template';
import { ExtendedBuildBuilderOptions } from './build';

export = (
    initialConfig: Configuration,
    options: {
        options: ExtendedBuildBuilderOptions;
        configuration: string;
    }
) => {
    const config = webpackMerge(initialConfig, getCustomWebpack());
    config.entry = getEntriesFromCloudformation(options.options);
    const webpackConfig = options.options.originalWebpackConfig;
    if (webpackConfig) {
        const configFn = require(webpackConfig);
        return configFn(config, options);
    }
    return config;
};

/**
 * Read the cloudformation template yaml, and use it to identify our input files.
 */
function getEntriesFromCloudformation(options: BuildBuilderOptions): Entry {
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

    const { dir, base } = parse(options.main);

    const handlers = functions
        .filter(
            (
                fn
            ): fn is Resource & {
                Properties: { [key: string]: any };
            } => !!fn.Properties
        )
        .map(fn => {
            const codeUri = fn.Properties.CodeUri;
            const src = resolve(dir, codeUri);
            const name = camelize(parse(src).name);
            // NB: this must match the output directory schema in the webpack config below
            // so if the output webpack pattern is [name]/[name].js, then this must be `${name}/`
            const newCodeUri = `${name}/`;
            fn.Properties.CodeUri = newCodeUri;
            return { src, name };
        });

    const alteredYaml = dump(cf, { schema: CLOUDFORMATION_SCHEMA });

    // todo: Question: Is creating this directory here really in keeping with the spirit of the thing?
    mkdirp(options.outputPath);
    writeFileSync(resolve(options.outputPath, base), alteredYaml, {
        encoding: 'utf-8'
    });

    const entries: { [name: string]: string[] } = {};
    handlers.map(handler => {
        const { name, src } = handler;
        entries[name] = [/*'./src/source-map-install.ts',*/ src];
    });
    return entries;
}

function getCustomWebpack(): Configuration {
    return {
        output: {
            libraryTarget: 'commonjs',
            // we create each chunk in it's own directory: this makes it easy to upload independent packages
            filename: '[name]/[name].js'
        },
        externals: [
            // use the aws-sdk provided on the lambda instead of uploading it
            /^aws-sdk/i
        ],
        optimization: {
            minimize: false
        }
    };
}
