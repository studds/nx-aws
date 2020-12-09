import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path'

import { DomainSchematicSchema } from './schema';

describe('domain schematic', () => {
  let appTree: Tree;
  const options: DomainSchematicSchema = { name: 'test' };

  const testRunner = new SchematicTestRunner(
    '@nx-aws/domain',
    join(__dirname, '../../../collection.json')
  );

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  it('should run successfully', async () => {
    await expect(testRunner.runSchematicAsync(
        'domain',
        options,
        appTree
      ).toPromise()
    ).resolves.not.toThrowError();
  })
});
