import { ExecutorOptions } from '@nrwl/js/src/utils/schema';
import { tscExecutor } from '@nrwl/js/src/executors/tsc/tsc.impl';
import { ExecutorContext } from '@nrwl/devkit';
import { basename, join } from 'path';
import { installNpmModules } from '../../builders/build/installNpmModules';
import { createPackageJson } from 'nx/src/utils/create-package-json';
import { TypescriptCompilationResult } from '@nrwl/js/src/utils/typescript/compile-typescript-files';
import { assert } from 'ts-essentials/dist/functions';
import { writeFileSync } from 'fs';
import { zipSync } from 'cross-zip';

interface Options extends ExecutorOptions {
    templatePath?: string;
}

export default async function* runExecutor(
    options: Options,
    context: ExecutorContext
) {
    options.outputPath = join(options.outputPath, 'nodejs');

    assert(context.projectName, `Missing project name from context`);
    const { sourceRoot } = context.workspace.projects[context.projectName];
    assert(sourceRoot, `Missing sourceRoot from ${context.projectName}`);

    // build with typescript
    const tsc = tscExecutor(options, context);
    let executionResult: TypescriptCompilationResult | undefined = undefined;
    for await (const emission of tsc) {
        executionResult = emission;
        yield executionResult;
    }

    assert(
        executionResult,
        `Expected execution result to be defined at this point but it was not.`
    );

    if (!executionResult.success) {
        // build failed; bail out
        return;
    }

    try {
        assert(context.projectGraph, `Missing project graph from context`);

        // generate and write package.json
        const packageJson = createPackageJson(
            context.projectName,
            context.projectGraph,
            {
                root: context.root,
                projectRoot: sourceRoot,
            }
        );
        writeFileSync(
            join(options.outputPath, 'package.json'),
            JSON.stringify(packageJson, null, 4),
            { encoding: 'utf-8' }
        );

        // install npm modules
        installNpmModules(options);

        // zip
        const outputPath = `${basename(options.outputPath)}.zip`;
        zipSync(options.outputPath, outputPath);

        yield executionResult;
    } catch (err) {
        console.error(err);
        yield {
            ...executionResult,
            success: false,
        };
    }
}
