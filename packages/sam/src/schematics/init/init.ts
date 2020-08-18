import { chain, noop, Rule } from '@angular-devkit/schematics';
import {
    addDepsToPackageJson,
    addPackageWithInit,
    formatFiles,
    setDefaultCollection,
    updateJsonInTree,
} from '@nrwl/workspace';
import { Schema } from './schema';

export const updateDependencies = addDepsToPackageJson(
    {},
    {
        '@nx-aws/sam': '*',
    }
);

function moveDependency(): Rule {
    return updateJsonInTree('package.json', (json) => {
        json.dependencies = json.dependencies || {};
        delete json.dependencies['@nx-aws/sam'];
        return json;
    });
}

export default function (schema: Schema) {
    return chain([
        setDefaultCollection('@nx-aws/sam'),
        addPackageWithInit('@nrwl/node', schema),
        schema.unitTestRunner === 'jest'
            ? addPackageWithInit('@nrwl/jest')
            : noop(),
        updateDependencies,
        moveDependency(),
        formatFiles(schema),
    ]);
}
