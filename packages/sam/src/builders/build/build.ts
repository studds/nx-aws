import { JsonObject } from '@angular-devkit/core';

import { of } from 'rxjs';
import { resolve } from 'path';
import { getEntriesFromCloudFormation } from './get-entries-from-cloudformation';
import { Entry } from 'webpack';
import { loadCloudFormationTemplate } from '../../utils/load-cloud-formation-template';
import { assert } from 'ts-essentials';
import { BuildNodeBuilderOptions } from '@nrwl/node/src/utils/types';
import { buildExecutor } from '@nrwl/node/src/executors/build/build.impl';
import { ExecutorContext } from '@nrwl/tao/src/shared/workspace';

export interface ExtendedBuildBuilderOptions extends BuildNodeBuilderOptions {
    originalWebpackConfig?: string;
    template: string;
    entry: string | Entry;
    buildPerFunction?: boolean;
}
export default cfBuilder;

/**
 * Custom build function for CloudFormation templates.
 *
 * Actual build is handled by nrwl's node builder. This just inspects a CloudFormation template
 * and finds things to build. Right now, it handles AWS::Serverless::Function
 *
 */
export async function* cfBuilder(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: ExecutorContext
) {
    normaliseOptions(options, context);

    // we inspect the CloudFormation template and return webpack entries for the functions
    // we want to build.
    // NB: there's one entry per function. This gives us more flexibility when it comes to
    // optimising the package for each function.
    const cf = loadCloudFormationTemplate(options.template);
    const entriesPerFn = getEntriesFromCloudFormation(options, cf);

    if (entriesPerFn.length === 0) {
        console.log(`Didn't find anything to build in CloudFormation template`);
        return of({ emittedFiles: [], success: true });
    }

    assert(
        !options.buildPerFunction,
        `Had to disable build per function for nx 12, honestly not that useful`
    );

    // in watch mode, we only want a single build for everything.
    const combinedEntry: Entry = {};
    entriesPerFn.forEach((entry) => {
        Object.keys(entry).forEach((key) => {
            combinedEntry[key] = entry[key];
        });
    });

    // we customise the build itself by passing a webpack config customising function to nrwl's builder
    addOurCustomWebpackConfig(options);

    // and now... to run the build

    // we have to have something here to keep the validation on nrwl's builder happy.
    options.main = 'placeholder to keep validation happy';
    // in our custom webpack config, we use this instead of nrwl's entry. Slightly
    // dirty, but gives us more control for very little cost :-)
    options.entry = combinedEntry;
    // kick off the build itself;
    return yield* buildExecutor(options, context);
}

/**
 *
 * nrwl's node builder has an option `webpackConfig` which takes a path to a function to
 * customise the final webpack config. We're using that to actually implement our changes to the webpack config.
 *
 */
function addOurCustomWebpackConfig(
    options: ExtendedBuildBuilderOptions & JsonObject
) {
    const webpackConfigPath = resolve(__dirname, 'config.js');
    if (options.webpackConfig) {
        const webpackConfig = Array.isArray(options.webpackConfig)
            ? options.webpackConfig
            : [options.webpackConfig];
        options.webpackConfig = [...webpackConfig, webpackConfigPath];
    } else {
        options.webpackConfig = [webpackConfigPath];
    }
}

/**
 *
 * This only normalises our options - we're piggy-backing on nrwl's node building, and that normalises
 * it's own options.
 *
 */
function normaliseOptions(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: ExecutorContext
) {
    // normalise the path to the template
    const originalTemplatePath = options.template;
    options.template = resolve(context.root, originalTemplatePath);
}
