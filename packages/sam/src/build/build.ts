import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { BuildResult } from '@angular-devkit/build-webpack';

import { Observable } from 'rxjs';
import { nodeBuilder, BuildNodeBuilderOptions } from './node-build';
import { resolve } from 'path';

export default createBuilder<JsonObject & BuildNodeBuilderOptions>(run);

function run(
    options: JsonObject & BuildNodeBuilderOptions,
    context: BuilderContext
): Observable<BuildResult> {
    const webpackConfig = resolve(__dirname, 'config.js');
    options.webpackConfig = webpackConfig;
    return nodeBuilder(options, context);
    // TODO: use scheduleBuilder instead once @nrwl/node:build supports that usecase
    // return from(context.scheduleBuilder('@nrwl/node:build', options)).pipe(
    //     switchMap(p => p.output)
    // );
}
