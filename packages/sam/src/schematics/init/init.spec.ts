import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { readJsonInTree } from '@nrwl/workspace';
import { runSchematic } from '../../utils/testing';

describe('init', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = Tree.empty();
        tree = createEmptyWorkspace(tree);
    });

    it('should add dependencies', async () => {
        const result = await runSchematic('init', {}, tree);
        const packageJson = readJsonInTree(result, 'package.json');

        expect(packageJson.dependencies['@nx-aws/sam']).toBeUndefined();
        expect(packageJson.devDependencies['@nx-aws/sam']).toBeDefined();
    });

    describe('defaultCollection', () => {
        it('should be set if none was set before', async () => {
            const result = await runSchematic('init', {}, tree);
            const workspaceJson = readJsonInTree(result, 'workspace.json');
            expect(workspaceJson.cli.defaultCollection).toEqual('@nx-aws/sam');
        });
    });

    it('should not add jest config if unitTestRunner is none', async () => {
        const result = await runSchematic(
            'init',
            {
                unitTestRunner: 'none',
            },
            tree
        );
        expect(result.exists('jest.config.js')).toEqual(false);
    });
});
