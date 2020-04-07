import { createBuilder, BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
    OutputValueRetriever,
    ImportStackOutput,
    ImportStackOutputs
} from '@nx-aws/core';

export interface S3DeployOptionsResource extends JsonObject {
    include: string[];
    cacheControl: string;
}

export interface S3DeployOptions extends JsonObject {
    resources: S3DeployOptionsResource[] | null;
    bucket: ImportStackOutput & JsonObject;
    distribution: (ImportStackOutput & JsonObject) | null;
    destPrefix: string | null;
    stackSuffix: string | null;
}

const outputValueRetriever = new OutputValueRetriever();

try {
    require('dotenv').config({ silent: true });
} catch (err) {}

export default createBuilder<S3DeployOptions>((options, context) => {
    const resources = normaliseResources(options.resources);

    return from(getOutputDir(context)).pipe(
        switchMap(async outputDir => {
            const map: ImportStackOutputs = { bucket: options.bucket };
            if (options.distribution) {
                map.distribution = options.distribution;
            }
            const stackSuffix = options.stackSuffix || undefined;
            const {
                Bucket: bucket,
                Distribution: distribution
            } = await outputValueRetriever.getOutputValues(
                map,
                context,
                stackSuffix
            );
            const destPrefix = options.destPrefix || '';
            const commands = resourceToS3Command(
                resources,
                outputDir,
                bucket,
                destPrefix
            );
            commands.push({
                command: `aws cloudfront create-invalidation --distribution-id ${distribution} --paths /index.html`
            });
            return context.scheduleBuilder('@nrwl/workspace:run-commands', {
                parallel: false,
                commands
            });
        }),
        switchMap(run => run.output)
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
    resources: S3DeployOptionsResource[] | null
): S3DeployOptionsResource[] {
    if (resources && resources.length > 0) {
        return resources;
    }
    return [
        { include: ['index.html'], cacheControl: 'public, max-age=300' },
        {
            include: ['*.js', '*.css', '*.woff'],
            cacheControl: 'public, max-age=315360000, immutable'
        },
        {
            include: [],
            cacheControl: 'public, max-age=86400'
        }
    ];
}

function resourceToS3Command(
    resources: S3DeployOptionsResource[],
    outputDir: string,
    bucketName: string,
    destPrefix: string
) {
    const allIncludes = resources.reduce<string[]>((acc, resource) => {
        return [...acc, ...resource.include];
    }, []);
    const s3Path = destPrefix ? `${bucketName}/${destPrefix}` : `${bucketName}`;
    const commands = resources.map(({ include, cacheControl }) => {
        const includePhrases = include.map(i => `--include "${i}"`).join(' ');
        const excludePhrases =
            include.length > 0
                ? `--exclude "*"`
                : allIncludes
                      .filter(i => include.includes(i))
                      .map(i => `--exclude "${i}"`);
        const command = `aws s3 sync --delete ${excludePhrases} ${includePhrases} ${outputDir} s3://${s3Path} --cache-control "${cacheControl}"`;
        return { command };
    });
    return commands;
}
