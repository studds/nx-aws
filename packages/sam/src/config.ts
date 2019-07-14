import { Configuration, Entry } from 'webpack';
import { BuildBuilderOptions } from '@nrwl/node/src/utils/types';
import { camelize } from '@angular-devkit/core/src/utils/strings';
import { load, dump } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import Resource from 'cloudform-types/types/resource';
import Template from 'cloudform-types/types/template';
import { sync as mkdirp } from 'mkdirp';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, parse } from 'path';
import webpackMerge from 'webpack-merge';

export = (
    initialConfig: Configuration,
    {
        options
    }: {
        options: BuildBuilderOptions;
        configuration: string;
    }
) => {
    const config = webpackMerge(initialConfig, getCustomWebpack());
    config.entry = getEntriesFromCloudformation(options);
    return config;
};

/**
 * Read the cloudformation template yaml, and use it to identify our input files.
 */
function getEntriesFromCloudformation(options: BuildBuilderOptions): Entry {
    // todo: Question: Is using sync file i/o OK in these builders? Did this initially
    // to get things working, then noticed that the node builder also does some sync io?
    const yaml = readFileSync(options.main, { encoding: 'utf-8' });
    const cf: Template = load(yaml, { schema: CLOUDFORMATION_SCHEMA });

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
            // NB: this must match the output filename schema in the webpack config below
            const newCodeUri = `${name}/${name}.js`;
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
        externals: {
            // use the aws-sdk provided on the lambda instead of uploading it
            'aws-sdk': 'aws-sdk'
        },
        optimization: {
            minimize: false
        }
    };
}
