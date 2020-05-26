import { createBuilder, BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
    OutputValueRetriever,
    ImportStackOutput,
    ImportStackOutputs
} from '@nx-aws/core';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export interface S3DeployOptionsResource extends JsonObject {
    include: string[];
    cacheControl: string;
    invalidate: boolean;
}

export interface S3DeployOptions extends JsonObject {
    resources: S3DeployOptionsResource[] | null;
    bucket: ImportStackOutput & JsonObject;
    distribution: (ImportStackOutput & JsonObject) | null;
    destPrefix: string | null;
    stackSuffix: string | null;
    config: {
        importStackOutputs: ImportStackOutputs & JsonObject;
        configFileName: string;
    } | null;
}

const outputValueRetriever = new OutputValueRetriever();

try {
    require('dotenv').config({ silent: true });
} catch (err) {}

export default createBuilder<S3DeployOptions>((options, context) => {
    const config = options.config;
    const resources = normaliseResources(
        options.resources,
        config?.configFileName
    );

    return from(getOutputDir(context)).pipe(
        switchMap(async (outputDir) => {
            const map = config?.importStackOutputs || {};
            map.bucket = options.bucket;
            if (options.distribution) {
                map.distribution = options.distribution;
            }
            const stackSuffix = options.stackSuffix || undefined;
            const {
                bucket,
                distribution,
                // any remaining output values will be those specified in config.importStackOutputs
                ...configFile
            } = await outputValueRetriever.getOutputValues(
                map,
                context,
                stackSuffix
            );
            if (config) {
                // write any values imported for config to the output directory
                writeFileSync(
                    resolve(outputDir, config.configFileName),
                    JSON.stringify(configFile),
                    { encoding: 'utf-8' }
                );
            }
            const destPrefix = options.destPrefix || '';
            const commands = resourceToS3Command(
                resources,
                outputDir,
                bucket,
                destPrefix,
                distribution
            );
            return context.scheduleBuilder('@nrwl/workspace:run-commands', {
                parallel: false,
                commands
            });
        }),
        switchMap((run) => run.output)
    );
});

async function getOutputDir(context: BuilderContext) {
    const project = context.target && context.target.project;
    if (!project) {
        throw new Error(`Could not find project name for target`);
    }
    const buildOptions = await context.getTargetOptions({
        project,
        target: 'build'
    });
    const outputDir = buildOptions.outputPath;
    if (typeof outputDir !== 'string') {
        throw new Error(`Expected to get outputdir on target ${project}:build`);
    }
    return outputDir;
}

function normaliseResources(
    resources: S3DeployOptionsResource[] | null,
    configFileName: string | undefined
): S3DeployOptionsResource[] {
    if (resources && resources.length > 0) {
        return resources;
    }
    const dynamicResources = ['index.html'];
    if (configFileName) {
        dynamicResources.push(configFileName);
    }
    return [
        {
            include: dynamicResources,
            cacheControl: 'public, max-age=1, stale-while-revalidate=300',
            invalidate: true
        },
        {
            include: ['*.js', '*.css', '*.woff'],
            cacheControl: 'public, max-age=315360000, immutable',
            invalidate: false
        },
        {
            include: [],
            cacheControl:
                'public, max-age=86400, stale-while-revalidate=315360000',
            invalidate: false
        }
    ];
}

function resourceToS3Command(
    resources: S3DeployOptionsResource[],
    outputDir: string,
    bucketName: string,
    destPrefix: string,
    distribution: string
) {
    const allIncludes = resources.reduce<string[]>((acc, resource) => {
        return [...acc, ...resource.include];
    }, []);
    const s3Path = destPrefix ? `${bucketName}/${destPrefix}` : `${bucketName}`;
    const commands = resources.map(({ include, cacheControl }) => {
        const includePhrases = include.map((i) => `--include "${i}"`).join(' ');
        const excludePhrases =
            include.length > 0
                ? `--exclude "*"`
                : allIncludes
                      .filter((i) => include.includes(i))
                      .map((i) => `--exclude "${i}"`);
        const command = `aws s3 sync --delete ${excludePhrases} ${includePhrases} ${outputDir} s3://${s3Path} --cache-control "${cacheControl}"`;
        return { command };
    });
    appendInvalidationCommand(distribution, resources, commands);
    return commands;
}

function appendInvalidationCommand(
    distribution: string,
    resources: S3DeployOptionsResource[],
    commands: { command: string }[]
) {
    if (distribution) {
        const resourcesToInvalidate = resources.filter(
            (needle) => needle.invalidate
        );
        if (resourcesToInvalidate.length > 1) {
            throw new Error(
                `Unsupported: invalidating more than a single resource set`
            );
        }
        const paths = resourcesToInvalidate[0].include
            .map((path) => `"/${path}"`)
            .join(' ');
        commands.push({
            command: `aws cloudfront create-invalidation --distribution-id ${distribution} --paths ${paths}`
        });
    }
}
