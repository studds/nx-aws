import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { loadYamlFile, runSchematic } from '../../utils/testing';
import { dumpCloudformationTemplate } from '../../utils/dumpCloudformationTemplate';

import { UpdateLambdasSchematicSchema } from './schema';

describe('update-lambdas schematic', () => {
    let appTree: Tree;
    const options: UpdateLambdasSchematicSchema = { projectName: 'test' };

    beforeEach(async () => {
        appTree = createEmptyWorkspace(Tree.empty());
        appTree = await runSchematic(
            'application',
            {
                name: 'test',
                linter: 'eslint',
                skipFormat: false,
                skipPackageJson: false,
                unitTestRunner: 'jest',
            },
            appTree
        );
        const template = loadYamlFile(appTree, 'apps/test/src/template.yaml');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        template.Resources!.Hello!.Properties!.Environment = {
            Variables: { HELLO: 'World' },
        };
        appTree.overwrite(
            'apps/test/src/template.yaml',
            dumpCloudformationTemplate(template)
        );
    });

    it('should run successfully', async () => {
        await expect(
            runSchematic('update-lambdas', options, appTree)
        ).resolves.not.toThrowError();
        expect(
            appTree.read('apps/test/src/app/hello/hello.ts')?.toString('utf-8')
        ).toContain("['HELLO']");
    });
});
