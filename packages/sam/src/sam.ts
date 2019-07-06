import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject, workspaces } from '@angular-devkit/core';
import { runWebpack, BuildResult } from '@angular-devkit/build-webpack';

import { Observable, from } from 'rxjs';
import { writeFileSync } from 'fs';
import { resolve, parse } from 'path';
import { map, concatMap } from 'rxjs/operators';
import { getNodeWebpackConfig } from '@nrwl/node/src/utils/node.config';
import { OUT_FILENAME } from '@nrwl/node/src/utils/config';
import { BuildBuilderOptions } from '@nrwl/node/src/utils/types';
import { normalizeBuildOptions } from '@nrwl/node/src/utils/normalize';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import webpackMerge from 'webpack-merge';
import { Configuration } from 'webpack';
import { sync as glob } from 'globby';
import { camelize } from '@angular-devkit/core/src/utils/strings';

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
            let config = webpackMerge(defaultConfig, getMore());
            console.log(options, context);

            const handlers = glob(options.handlerPattern, {
                cwd: options.root
            });
            const entries: { [name: string]: string[] } = {};
            handlers.map(handler => {
                const name = camelize(parse(handler).name);
                entries[name] = [/*'./src/source-map-install.ts',*/ handler];
            });
            config.entry = entries;
            console.log(config);
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

function getMore(): Configuration {
    return {
        // todo: need to generate these
        output: {
            libraryTarget: 'commonjs',
            filename: '[name]/[name].js'
        },
        externals: {
            'aws-sdk': 'aws-sdk',
            'chrome-aws-lambda': 'chrome-aws-lambda',
            'puppeteer-core': 'puppeteer-core'
        },
        optimization: {
            minimize: false
        }
    };
}
