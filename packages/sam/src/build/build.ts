import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { BuildResult, EmittedFiles } from '@angular-devkit/build-webpack';

import { Observable, from, forkJoin } from 'rxjs';
import { nodeBuilder, BuildNodeBuilderOptions } from './node-build';
import { resolve, parse } from 'path';
import { getEntriesFromCloudformation } from './get-entries-from-cloudformation';
import { concatMap, map } from 'rxjs/operators';
import { Target } from '@angular-devkit/architect/src/output-schema';
import { copyFileSync } from 'fs';
import { sync as mkdirpSync } from 'mkdirp';

export interface ExtendedBuildBuilderOptions extends BuildNodeBuilderOptions {
    originalWebpackConfig?: string;
    template: string;
}
export default createBuilder<ExtendedBuildBuilderOptions & JsonObject>(run);

function run(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: BuilderContext
): Observable<BuildResult> {
    // normalise template
    const originalTemplatePath = options.template;
    options.template = resolve(context.workspaceRoot, originalTemplatePath);
    mkdirpSync(options.outputPath);
    copyFileSync(
        options.template,
        resolve(options.outputPath, parse(originalTemplatePath).base)
    );

    const entries = getEntriesFromCloudformation(options);

    const webpackConfig = resolve(__dirname, 'config.js');
    // cache the original webpack config path for later :-)
    if (options.webpackConfig) {
        options.originalWebpackConfig = resolve(
            context.workspaceRoot,
            options.webpackConfig
        );
    }
    options.webpackConfig = webpackConfig;

    const blah = forkJoin(
        from(entries).pipe(
            concatMap(entry => {
                context.logger.log('info', `Running build for entry ${entry}`);
                options.main = entry;
                return nodeBuilder(options, context);
                // TODO: use scheduleBuilder instead once @nrwl/node:build supports that usecase
                // return from(context.scheduleBuilder('@nrwl/node:build', options)).pipe(
                //     switchMap(p => p.output)
                // );
            })
        )
    ).pipe(
        map(
            (results): BuildResult => {
                const emittedFiles: EmittedFiles[] = [
                    { file: options.template, extension: 'yaml', initial: true }
                ];
                let error = '';
                const info: {
                    [key: string]: any;
                } = {};
                let success = true;
                let target: Target | undefined;
                results.forEach(result => {
                    success = success && result.success;
                    if (result.error) {
                        error = error + result.error + '\n';
                    }
                    Object.assign(info, result.info);
                    target = result.target;
                    emittedFiles.push(...(result.emittedFiles || []));
                });
                return ({
                    emittedFiles,
                    error,
                    info,
                    success,
                    target
                } as unknown) as BuildResult;
            }
        )
    );
    return blah;
}
