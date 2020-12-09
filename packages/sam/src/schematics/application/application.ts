import {
    apply,
    chain,
    externalSchematic,
    mergeWith,
    move,
    Rule,
    SchematicContext,
    template,
    Tree,
    url,
} from '@angular-devkit/schematics';
import { join, normalize, Path } from '@angular-devkit/core';
import { Schema } from './schema';
import { formatFiles, toFileName, updateJsonInTree } from '@nrwl/workspace';
import init from '../init/init';
import {
    appsDir,
    updateWorkspaceInTree,
} from '@nrwl/workspace/src/utils/ast-utils';

interface NormalizedSchema extends Schema {
    appProjectRoot: Path;
}
type BuilderConfig = {
    builder: string;
    options: Record<string, any>;
    configurations?: Record<string, any>;
};

type Architect = Record<string, BuilderConfig>;

function updateWorkspaceJson(options: NormalizedSchema): Rule {
    return updateWorkspaceInTree((workspaceJson) => {
        const project: { architect: Architect } =
            workspaceJson.projects[options.name];

        project.architect.build.builder = '@nx-aws/sam:build';
        project.architect.build.options = {
            ...project.architect.build.options,
            template: `${options.appProjectRoot}/src/template.yaml`,
            sourceMap: true,
            maxWorkers: 1,
        };

        project.architect.serve = {
            builder: '@nx-aws/sam:execute',
            options: {
                buildTarget: `${options.name}:build`,
                packageTarget: `${options.name}:package`,
            },
        };

        project.architect.package = {
            builder: '@nx-aws/sam:package',
            options: {
                templateFile: `${options.appProjectRoot}/src/template.yaml`,
                outputTemplateFile: `dist/${options.appProjectRoot}/serverless-output.yaml`,
                s3Prefix: `${options.appProjectRoot}`,
            },
            configurations: {
                production: {},
            },
        };

        project.architect.deploy = {
            builder: '@nx-aws/sam:deploy',
            options: {
                templateFile: `dist/${options.appProjectRoot}/serverless-output.yaml`,
                s3Prefix: `${options.appProjectRoot}`,
                capabilities: ['CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND'],
            },
            configurations: {
                production: {
                    stackSuffix: 'prod',
                },
            },
        };

        return workspaceJson;
    });
}

function removeMainFile(options: NormalizedSchema): Rule {
    return (host: Tree) => {
        host.delete(join(options.appProjectRoot, 'src/main.ts'));
    };
}

function addAppFiles(options: NormalizedSchema): Rule {
    return mergeWith(
        apply(url(`./files`), [
            template({
                tmpl: '',
                name: options.name,
                root: options.appProjectRoot,
            }),
            move(join(options.appProjectRoot, 'src')),
        ])
    );
}

export default function (schema: Schema): Rule {
    return (host: Tree, context: SchematicContext) => {
        const options = normalizeOptions(host, schema);
        return chain([
            init({
                ...options,
                skipFormat: true,
            }),
            externalSchematic('@nrwl/node', 'application', schema),
            updateWorkspaceJson(options),
            removeMainFile(options),
            addAppFiles(options),
            updateJsonInTree(
                join(options.appProjectRoot, 'tsconfig.app.json'),
                (json) => {
                    json.compilerOptions.target = 'es2018';
                    return json;
                }
            ),
            formatFiles(options),
        ])(host, context);
    };
}

function normalizeOptions(host: Tree, options: Schema): NormalizedSchema {
    const appDirectory = options.directory
        ? `${toFileName(options.directory)}/${toFileName(options.name)}`
        : toFileName(options.name);
    const appProjectRoot = join(normalize(appsDir(host)), appDirectory);
    const appProjectName = toFileName(
        appDirectory.replace(new RegExp('/', 'g'), '-')
    );

    return {
        ...options,
        appProjectRoot,
        name: appProjectName,
    };
}
