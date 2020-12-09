import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path';

import { S3SchematicSchema } from './schema';

describe('s3 schematic', () => {
  let appTree: Tree;
  const options: S3SchematicSchema = { name: 'test' };

  const testRunner = new SchematicTestRunner(
    '@nx-aws/s3',
    join(__dirname, '../../../collection.json')
  );

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  it('should run successfully', async () => {
    await expect(
      testRunner.runSchematicAsync('s3', options, appTree).toPromise()
    ).resolves.not.toThrowError();
  });
});
