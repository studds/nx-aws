/**
 * copied & pasted with minor modifications from https://github.com/nrwl/nx/blob/master/packages/node/src/builders/build/build.impl.ts
 * modifications:
 * - casts so that it builds under strict
 * - export run function as 'nodeBuilder'
 * TODO: use scheduleBuilder once @nrwl/node is updated to support that
 */

import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject, workspaces } from '@angular-devkit/core';
import { runWebpack, BuildResult } from '@angular-devkit/build-webpack';

import { Observable, from } from 'rxjs';
import { resolve } from 'path';
import { map, concatMap } from 'rxjs/operators';
import { getNodeWebpackConfig } from '@nrwl/node/src/utils/node.config';
import { OUT_FILENAME } from '@nrwl/node/src/utils/config';
import { BuildBuilderOptions } from '@nrwl/node/src/utils/types';
import { normalizeBuildOptions } from '@nrwl/node/src/utils/normalize';
import { NodeJsSyncHost } from '@angular-devkit/core/node';

try {
    require('dotenv').config();
} catch (e) {}

export interface BuildNodeBuilderOptions extends BuildBuilderOptions {
    optimization?: boolean;
    sourceMap?: boolean;
    externalDependencies: 'all' | 'none' | string[];
}

export type NodeBuildEvent = BuildResult & {
    outfile: string;
};

export default createBuilder<JsonObject & BuildNodeBuilderOptions>(nodeBuilder);

export function nodeBuilder(
    options: JsonObject & BuildNodeBuilderOptions,
    context: BuilderContext
): Observable<NodeBuildEvent> {
    return from(getSourceRoot(context)).pipe(
        map(({sourceRoot, projectRoot}) =>
            normalizeBuildOptions(options, context.workspaceRoot, sourceRoot, projectRoot)
        ),
        map(options => {
            let config = getNodeWebpackConfig(options);
            if (options.webpackConfig) {
                config = require(options.webpackConfig)(config, {
                    options,
                    configuration: context.target!.configuration
                });
            }
            return config;
        }),
        concatMap(config =>
            runWebpack(config, context, {
                logging: stats => {
                    context.logger.info(stats.toString(config.stats));
                },
                webpackFactory: require('webpack')
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
    const project = workspace.projects.get(context.target!.project);
    const sourceRoot = project?.sourceRoot;
    const projectRoot = project?.root;
    if (sourceRoot && projectRoot) {
        return {sourceRoot, projectRoot};
    } else {
        context.reportStatus('Error');
        const message = `${
            context.target!.project
        } does not have a sourceRoot or project root. Please define one.`;
        context.logger.error(message);
        throw new Error(message);
    }
}
