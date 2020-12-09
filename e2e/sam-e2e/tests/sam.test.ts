import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
describe('sam e2e', () => {
  it('should create sam', async (done) => {
    const plugin = uniq('sam');
    ensureNxProject('@nx-aws/sam', 'dist/packages/sam');
    await runNxCommandAsync(`generate @nx-aws/sam:sam ${plugin}`);

    const result = await runNxCommandAsync(`build ${plugin}`);
    expect(result.stdout).toContain('Builder ran');

    done();
  });

  describe('--directory', () => {
    it('should create src in the specified directory', async (done) => {
      const plugin = uniq('sam');
      ensureNxProject('@nx-aws/sam', 'dist/packages/sam');
      await runNxCommandAsync(
        `generate @nx-aws/sam:sam ${plugin} --directory subdir`
      );
      expect(() =>
        checkFilesExist(`libs/subdir/${plugin}/src/index.ts`)
      ).not.toThrow();
      done();
    });
  });

  describe('--tags', () => {
    it('should add tags to nx.json', async (done) => {
      const plugin = uniq('sam');
      ensureNxProject('@nx-aws/sam', 'dist/packages/sam');
      await runNxCommandAsync(
        `generate @nx-aws/sam:sam ${plugin} --tags e2etag,e2ePackage`
      );
      const nxJson = readJson('nx.json');
      expect(nxJson.projects[plugin].tags).toEqual(['e2etag', 'e2ePackage']);
      done();
    });
  });
});
