import { ensureNxProject } from '@nrwl/nx-plugin/testing';
describe('s3 e2e', () => {
    it('should create s3', async (done) => {
        ensureNxProject('@nx-aws/s3', 'dist/packages/s3');

        // no op at the moment....

        done();
    });
});
