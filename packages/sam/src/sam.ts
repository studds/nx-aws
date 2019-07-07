import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject, workspaces } from '@angular-devkit/core';
import { runWebpack, BuildResult } from '@angular-devkit/build-webpack';

import { Observable, from } from 'rxjs';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, parse } from 'path';
import { map, concatMap } from 'rxjs/operators';
import { getNodeWebpackConfig } from '@nrwl/node/src/utils/node.config';
import { OUT_FILENAME } from '@nrwl/node/src/utils/config';
import { BuildBuilderOptions } from '@nrwl/node/src/utils/types';
import { normalizeBuildOptions } from '@nrwl/node/src/utils/normalize';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import webpackMerge from 'webpack-merge';
import { Configuration, Entry } from 'webpack';
import { camelize } from '@angular-devkit/core/src/utils/strings';

import { load, dump } from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'cloudformation-js-yaml-schema';
import Resource from 'cloudform-types/types/resource';
import Template from 'cloudform-types/types/template';
import { sync as mkdirp } from 'mkdirp';

try {
    require('dotenv').config();
} catch (e) {}

export interface BuildNodeBuilderOptions extends BuildBuilderOptions {
    optimization?: boolean;
    sourceMap?: boolean;
    externalDependencies: 'all' | 'none' | string[];
    handlerPattern: string;
}

export type NodeBuildEvent = BuildResult & {
    outfile: string;
};

export default createBuilder<JsonObject & BuildNodeBuilderOptions>(run);

function run(
    options: JsonObject & BuildNodeBuilderOptions,
    context: BuilderContext
): Observable<NodeBuildEvent> {
    return from(getSourceRoot(context)).pipe(
        map(sourceRoot =>
            normalizeBuildOptions(options, context.workspaceRoot, sourceRoot)
        ),
        map(options => {
            const defaultConfig: Configuration = getNodeWebpackConfig(options);
            let config = webpackMerge(defaultConfig, getCustomWebpack());
            config.entry = getEntriesFromCloudformation(options, context);
            if (options.webpackConfig) {
                config = require(options.webpackConfig)(config, {
                    options,
                    configuration:
                        context.target && context.target.configuration
                });
            }
            return config;
        }),
        concatMap(config =>
            runWebpack(config, context, {
                logging: stats => {
                    if (options.statsJson) {
                        writeFileSync(
                            resolve(
                                context.workspaceRoot,
                                options.outputPath,
                                'stats.json'
                            ),
                            JSON.stringify(stats.toJson(), null, 2)
                        );
                    }

                    context.logger.info(stats.toString());
                }
            })
        ),
        map((buildEvent: BuildResult) => {
            buildEvent.outfile = resolve(
                context.workspaceRoot,
                options.outputPath,
                OUT_FILENAME
            );
            return buildEvent as NodeBuildEvent;
        })
    );
}

async function getSourceRoot(context: BuilderContext) {
    const workspaceHost = workspaces.createWorkspaceHost(new NodeJsSyncHost());
    const { workspace } = await workspaces.readWorkspace(
        context.workspaceRoot,
        workspaceHost
    );
    const projectName = context.target
        ? context.target.project
        : 'Undefined target';
    const project = workspace.projects.get(projectName);
    if (project && project.sourceRoot) {
        return project.sourceRoot;
    } else {
        context.reportStatus('Error');
        const message = `${project} does not have a sourceRoot. Please define one.`;
        context.logger.error(message);
        throw new Error(message);
    }
}

/**
 * Read the cloudformation template yaml, and use it to identify our input files.
 */
function getEntriesFromCloudformation(
    options: JsonObject & BuildNodeBuilderOptions,
    context: BuilderContext
): Entry {
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
    mkdirp(resolve(context.workspaceRoot, options.outputPath));
    writeFileSync(
        resolve(context.workspaceRoot, options.outputPath, base),
        alteredYaml,
        {
            encoding: 'utf-8'
        }
    );

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
