import { JsonObject } from '@angular-devkit/core';

import { join, resolve } from 'path';
import { getEntriesFromCloudFormation } from './get-entries-from-cloudformation';
import { EntryObject } from 'webpack';
import { loadCloudFormationTemplate } from '../../utils/load-cloud-formation-template';
import { assert } from 'ts-essentials';
import { WebpackExecutorOptions } from '@nrwl/webpack/src/executors/webpack/schema';
import { webpackExecutor } from '@nrwl/node/src/executors/webpack/webpack.impl';
import { ExecutorContext } from '@nrwl/devkit';
import { installNpmModules } from './installNpmModules';
import { createPackageJson as generatePackageJson } from 'nx/src/utils/create-package-json';
import { writeFileSync } from 'fs';

export interface ExtendedBuildBuilderOptions extends WebpackExecutorOptions {
    originalWebpackConfig?: string;
    template: string;
    entry: string | EntryObject;
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
        yield { emittedFiles: [], success: true };
        return;
    }

    assert(
        !options.buildPerFunction,
        `Had to disable build per function for nx 12, honestly not that useful`
    );

    // in watch mode, we only want a single build for everything.
    const combinedEntry: EntryObject = {};
    entriesPerFn.forEach((entry) => {
        Object.keys(entry).forEach((key) => {
            combinedEntry[key] = entry[key];
        });
    });

    // we customise the build itself by passing a webpack config customising function to nrwl's builder
    addOurCustomWebpackConfig(options, context);

    // and now... to run the build

    // we have to have something here to keep the validation on nrwl's builder happy.
    options.main = 'placeholder to keep validation happy';
    // in our custom webpack config, we use this instead of nrwl's entry. Slightly
    // dirty, but gives us more control for very little cost :-)
    options.entry = combinedEntry;
    // kick off the build itself;

    yield* webpackExecutor(options, context);

    if (options.generatePackageJson) {
        assert(context.projectName, `Missing project name from target`);
        assert(context.projectGraph, `Missing project graph from target`);
        const packageJson = generatePackageJson(
            context.projectName,
            context.projectGraph,
            {
                root: context.root,
                projectRoot:
                    context.workspace.projects[context.projectName].sourceRoot,
            }
        );
        const externalDependencies = options.externalDependencies;
        if (Array.isArray(externalDependencies)) {
            Object.keys(packageJson.dependencies).forEach((key) => {
                if (!externalDependencies.includes(key)) {
                    delete packageJson.dependencies[key];
                }
            });
        }
        writeFileSync(
            join(options.outputPath, 'package.json'),
            JSON.stringify(packageJson, null, 4),
            { encoding: 'utf-8' }
        );
        installNpmModules(options);
    }
}

/**
 *
 * nrwl's node builder has an option `webpackConfig` which takes a path to a function to
 * customise the final webpack config. We're using that to actually implement our changes to the webpack config.
 *
 */
function addOurCustomWebpackConfig(
    options: ExtendedBuildBuilderOptions & JsonObject,
    context: ExecutorContext
) {
    const webpackConfigPath = resolve(__dirname, 'config.js');
    if (options.webpackConfig) {
        options.originalWebpackConfig = resolve(
            context.root,
            options.webpackConfig
        );
    }
    options.webpackConfig = webpackConfigPath;
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
