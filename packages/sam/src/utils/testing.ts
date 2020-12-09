import { join } from 'path';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { Rule, Tree } from '@angular-devkit/schematics';
import {
    parseCloudFormationTemplate,
    ParsedSamTemplate,
} from './load-cloud-formation-template';

const testRunner = new SchematicTestRunner(
    '@nrwl/nest',
    join(__dirname, '../../collection.json')
);

export function runSchematic(schematicName: string, options: any, tree: Tree) {
    return testRunner
        .runSchematicAsync(schematicName, options, tree)
        .toPromise();
}

export function callRule(rule: Rule, tree: Tree) {
    return testRunner.callRule(rule, tree).toPromise();
}

export function loadYamlFile(
    tree: Tree,
    templateFile: string
): ParsedSamTemplate {
    const templateYaml = tree.read(templateFile)?.toString('utf-8');
    if (!templateYaml) {
        throw new Error(
            `Couldn't find could not read template from ${templateFile}`
        );
    }
    const template = parseCloudFormationTemplate(templateYaml);
    return template;
}
