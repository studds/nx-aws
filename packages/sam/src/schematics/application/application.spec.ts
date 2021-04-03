import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { runSchematic } from '../../utils/testing';
import { readJsonInTree } from '@nrwl/workspace';

describe('app', () => {
    let appTree: Tree;

    beforeEach(() => {
        appTree = Tree.empty();
        appTree = createEmptyWorkspace(appTree);
    });

    xit('should generate files', async () => {
        const tree = await runSchematic('app', { name: 'myNodeApp' }, appTree);
        expect(
            tree.readContent('apps/my-node-app/src/app/hello/hello.ts')
        ).toContain(`export const handler = lambda`);
        expect(tree.exists('apps/my-node-app/src/template.yaml')).toBeTruthy();
    });

    it('should have es2018 as the tsconfig target', async () => {
        const tree = await runSchematic('app', { name: 'myNodeApp' }, appTree);
        const tsconfig = readJsonInTree(
            tree,
            'apps/my-node-app/tsconfig.app.json'
        );
        expect(tsconfig.compilerOptions.target).toBe('es2018');
    });
});
