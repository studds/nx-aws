import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { BuildResult, EmittedFiles } from '@angular-devkit/build-webpack';

import { Observable, from, forkJoin, of } from 'rxjs';
import { nodeBuilder, BuildNodeBuilderOptions } from './node-build';
import { resolve } from 'path';
import { getEntriesFromCloudFormation } from './get-entries-from-cloudformation';
import { concatMap, map } from 'rxjs/operators';
import { Target } from '@angular-devkit/architect/src/output-schema';
import { Entry } from 'webpack';

export interface ExtendedBuildBuilderOptions extends BuildNodeBuilderOptions {
    originalWebpackConfig?: string;
    template: string;
    entry: string | Entry;
}
export default createBuilder<ExtendedBuildBuilderOptions & JsonObject>(run);

/**
 * Custom build function for CloudFormation templates.
 *
 * Actual build is handled by nrwl's node builder. This just inspects a CloudFormation template
 * and finds things to build. Right now, it handles AWS::Serverless::Function and AWS::Serverless::LayerVersion
 *
 */
function run(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: BuilderContext
): Observable<BuildResult> {
    normaliseOptions(options, context);

    // we inspect the CloudFormation template and return webpack entries for the functions / layers
    // we want to build.
    // NB: there's one entry per function. This gives us more flexibility when it comes to
    // optimising the package for each function.
    const entries = getEntriesFromCloudFormation(options, context);

    if (entries.length === 0) {
        context.logger.info(
            `Didn't find anything to build in CloudFormation template`
        );
        return of({ emittedFiles: [], success: true });
    }

    // we customise the build itself by passing a webpack config customising function to nrwl's builder
    addOurCustomWebpackConfig(options, context);

    // and now... to run the build

    // "forkJoin" means "give me an array of every value that gets emitted by this observable, once it's complete"
    return forkJoin(
        from(entries).pipe(
            // concatMap means "map this array to another observable, and run one at a time"
            // we're kicking off one build per entry; using concat map means only one build runs at a time
            concatMap(entry => {
                context.logger.log(
                    'info',
                    `Running build for entry ${Object.keys(entry)[0]}`
                );
                // we have to have something here to keep the validation on nrwl's builder happy.
                options.main = 'placeholder to keep validation happy';
                // in our custom webpack config, we use this instead of nrwl's entry. Slightly
                // dirty, but gives us more control for very little cost :-)
                options.entry = entry;
                // kick off the build itself;
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
                // probably overkill, but compile all the results.
                const emittedFiles: EmittedFiles[] = [];
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
}

/**
 *
 * nrwl's node builder has an option `webpackConfig` which takes a path to a function to
 * customise the final webpack config. We're using that to actually implement our changes to the webpack config.
 *
 */
function addOurCustomWebpackConfig(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: BuilderContext
) {
    const webpackConfig = resolve(__dirname, 'config.js');
    // cache the original webpack config path for later :-)
    // our custom webpack config will trigger this, to allow downstream users to further customise.
    if (options.webpackConfig) {
        options.originalWebpackConfig = resolve(
            context.workspaceRoot,
            options.webpackConfig
        );
    }
    options.webpackConfig = webpackConfig;
}

/**
 *
 * This only normalises our options - we're piggy-backing on nrwl's node building, and that normalises
 * it's own options.
 *
 */
function normaliseOptions(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: BuilderContext
) {
    // normalise the path to the template
    const originalTemplatePath = options.template;
    options.template = resolve(context.workspaceRoot, originalTemplatePath);
}
