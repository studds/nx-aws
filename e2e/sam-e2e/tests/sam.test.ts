import {
    // checkFilesExist,
    ensureNxProject,
    // readJson,
    runNxCommandAsync,
    uniq,
} from '@nrwl/nx-plugin/testing';
describe('sam e2e', () => {
    it('should create sam', async (done) => {
        const plugin = uniq('sam');
        ensureNxProject('@nx-aws/sam', 'dist/packages/sam');
        await runNxCommandAsync(`generate @nx-aws/sam:app ${plugin}`);

        const result = await runNxCommandAsync(`build ${plugin}`);
        expect(result.stdout).toContain('chunk {app/hello/hello}');

        done();
    });
});
