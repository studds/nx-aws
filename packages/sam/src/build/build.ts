import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { BuildResult } from '@angular-devkit/build-webpack';

import { Observable } from 'rxjs';
import { nodeBuilder, BuildNodeBuilderOptions } from './node-build';
import { resolve } from 'path';

export interface ExtendedBuildBuilderOptions extends BuildNodeBuilderOptions {
    originalWebpackConfig?: string;
}
export default createBuilder<ExtendedBuildBuilderOptions & JsonObject>(run);

function run(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: BuilderContext
): Observable<BuildResult> {
    const webpackConfig = resolve(__dirname, 'config.js');
    // cache the original webpack config path for later :-)
    if (options.webpackConfig) {
        options.originalWebpackConfig = resolve(
            context.workspaceRoot,
            options.webpackConfig
        );
    }
    options.webpackConfig = webpackConfig;
    return nodeBuilder(options, context);
    // TODO: use scheduleBuilder instead once @nrwl/node:build supports that usecase
    // return from(context.scheduleBuilder('@nrwl/node:build', options)).pipe(
    //     switchMap(p => p.output)
    // );
}
