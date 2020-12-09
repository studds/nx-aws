import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { formatFiles, getProjectConfig } from '@nrwl/workspace';
import Resource from 'cloudform-types/types/resource';
import { getLambdaSourcePath } from '../../utils/getLambdaSourcePath';
import { SamFunctionProperties } from '../../utils/SamFunctionProperties';
import { loadYamlFile } from '../../utils/testing';
import { getUpdates } from './getUpdates';
import { UpdateLambdasSchematicSchema } from './schema';

export default function (options: UpdateLambdasSchematicSchema): Rule {
    return chain([
        updateLambdasInTree(options),
        formatFiles({ skipFormat: false }),
    ]);
}

function updateLambdasInTree(options: UpdateLambdasSchematicSchema) {
    return (tree: Tree): void => {
        const project = getProjectConfig(tree, options.projectName);
        const templateFile: string | undefined =
            project?.architect?.package?.options?.templateFile;
        if (!templateFile) {
            throw new Error(
                `Couldn't find templateFile option on ${project}:package`
            );
        }
        const template = loadYamlFile(tree, templateFile);
        const resources = template.Resources;
        if (!resources) {
            return;
        }
        updateLambdasFromResources(tree, resources, templateFile);
    };
}

function updateLambdasFromResources(
    tree: Tree,
    resources: Record<string, Resource>,
    templatePath: string
) {
    for (const resourceName in resources) {
        if (Object.prototype.hasOwnProperty.call(resources, resourceName)) {
            const resource = resources[resourceName];
            if (resource.Type.endsWith('Function')) {
                updateFunction(resource, tree, resourceName, templatePath);
            }
        }
    }
}

function updateFunction(
    resource: Resource,
    tree: Tree,
    resourceName: string,
    templatePath: string
) {
    const properties: Partial<SamFunctionProperties> | undefined =
        resource.Properties;
    if (!properties) {
        console.warn(`No properties on function ${resourceName}`);
        return;
    }
    const { sourcePath, functionName, sourceText } = getSourceText(
        properties,
        resourceName,
        templatePath,
        tree
    );
    const envVarsObject = properties?.Environment?.Variables;
    const environmentVariables = envVarsObject
        ? Object.keys(envVarsObject)
        : [];
    const updates = getUpdates({
        fileName: sourcePath,
        functionName,
        sourceText,
        targetConfig: { environmentVariables },
    });
    const recorder = tree.beginUpdate(sourcePath);
    updates.forEach((update) => {
        recorder.remove(update.start, update.end - update.start);
        recorder.insertLeft(update.start, update.replacement);
    });
    tree.commitUpdate(recorder);
}

function getSourceText(
    properties: Partial<SamFunctionProperties>,
    resourceName: string,
    templatePath: string,
    tree: Tree
) {
    const { src: sourcePath, functionName } = getLambdaSourcePath(
        templatePath,
        resourceName,
        properties
    );
    const sourceText = tree.read(sourcePath)?.toString('utf-8');
    if (!sourceText) {
        throw new Error(`${sourcePath} was empty`);
    }
    return { sourceText, functionName, sourcePath };
}
