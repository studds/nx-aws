import Resource from 'cloudform-types/types/resource';
import { resolve, parse, join, relative } from 'path';
import { loadCloudFormationTemplate, Globals } from '@nx-aws/sam';
import { ExtendedBuildBuilderOptions } from './build';
import { isFile } from '@angular-devkit/core/node/fs';
import { readFileSync, writeFileSync } from 'fs';
import { BuilderContext } from '@angular-devkit/architect';
import { sync as mkdirp } from 'mkdirp';
import { Entry } from 'webpack';
import { getLambdaSourcePath } from '../../utils/getLambdaSourcePath';

/**
 * Read the CloudFormation template yaml, and use it to identify our input files.
 */
export function getEntriesFromCloudFormation(
    options: ExtendedBuildBuilderOptions,
    context: BuilderContext
): Array<Entry> {
    const cf = loadCloudFormationTemplate(options.template);
    const globals = cf.Globals;
    const resources = cf.Resources;
    if (!resources) {
        throw new Error("CloudFormation template didn't contain any resources");
    }
    return Object.keys(resources)
        .map((name) => {
            return getEntry(name, resources[name], options, context, globals);
        })
        .filter((s): s is Entry => !!s);
}

function getEntry(
    resourceName: string,
    resource: Resource,
    options: ExtendedBuildBuilderOptions,
    context: BuilderContext,
    globalProperties?: Globals
): Entry | undefined {
    const properties = resource.Properties;
    if (!properties) {
        return;
    }

    // we add source-map-install to all entries - it's nice to get mapped error messages
    // from your lambdas

    const srcMapInstall = resolve(__dirname, 'source-map-install.js');
    if (resource.Type === 'AWS::Serverless::Function') {
        return getEntryForFunction(
            resourceName,
            properties,
            options,
            srcMapInstall,
            globalProperties?.Function
        );
    } else if (resource.Type === 'AWS::Serverless::LayerVersion') {
        return getEntryForLayer(properties, options, context, srcMapInstall);
    } else {
        return;
    }
}
function getEntryForFunction(
    resourceName: string,
    properties: { [key: string]: any },
    options: ExtendedBuildBuilderOptions,
    srcMapInstall: string,
    globalProperties?: { [key: string]: any }
) {
    const { src, dir } = getLambdaSourcePath(
        options.template,
        resourceName,
        properties,
        globalProperties
    );
    const entryName = relative(dir, src).replace('.ts', '');
    return { [entryName]: [srcMapInstall, src] };
}

function getEntryForLayer(
    properties: { [key: string]: any },
    options: ExtendedBuildBuilderOptions,
    context: BuilderContext,
    srcMapInstall: string
) {
    const { dir } = parse(options.template);

    // first let's find out if we've got a package.json - without a package.json we cannot have a layer
    const contentUri: string = properties.ContentUri;
    const path = resolve(dir, contentUri);
    const packagePath = resolve(path, 'package.json');
    if (!isFile(packagePath)) {
        context.logger.info(
            `Did not find a package for layer at ${contentUri}; ignoring`
        );
        return;
    }

    // then let's find the "main" entry point defined by package.json - we need that to run the build
    // (and indeed, it's necessary for the layer)
    const packageJson = JSON.parse(
        readFileSync(packagePath, { encoding: 'utf-8' })
    );
    const main: string = packageJson.main;
    if (!main) {
        context.logger.warn(
            `Package for layer at ${contentUri} did not contain a 'main' entry point, required for building the layer`
        );
        return;
    }

    const { outputPath, mainName } = updatePackageJson(
        contentUri,
        main,
        packageJson,
        options
    );

    // override the original output path with the new calculated output path, which has the structure
    // required for lambda layers.
    options.outputPath = outputPath;

    // return the entry
    const entryName = mainName;
    const mainPath = resolve(path, main);
    return { [entryName]: [srcMapInstall, mainPath] };
}

/**
 * We need to update the package.json to point to the output js file, rather than the input ts file
 */
function updatePackageJson(
    contentUri: string,
    main: string,
    packageJson: any,
    options: ExtendedBuildBuilderOptions
) {
    const mainName = parse(main).name;
    packageJson.main = mainName + '.js';
    const packageName = packageJson.name;
    // we calculate a new output path that has the structure required for lambda layers
    const relativeOutputPath = join(
        contentUri,
        'nodejs/node_modules',
        packageName
    );
    const outputPath = resolve(options.outputPath, relativeOutputPath);
    mkdirp(outputPath);
    // write out the amended package.json in the output director
    writeFileSync(
        resolve(outputPath, 'package.json'),
        JSON.stringify(packageJson, null, 4),
        { encoding: 'utf-8' }
    );
    return { outputPath, mainName };
}
