const dotenv = require('dotenv');
dotenv.config();

module.exports = function() {
    return {
        files: [
            'src/**/*.ts',
            { pattern: 'src/**/*.spec.ts', ignore: true },
            { pattern: 'src/**/*.int.ts', ignore: true }
        ],
        tests: ['src/**/*.spec.ts'],
        env: {
            type: 'node'
        },
        setup(wallaby) {
            if (global._tsconfigPathsRegistered) {
                return;
            }
            const path = require('path');
            const readFileSync = require('fs').readFileSync;
            const tsConfigPaths = require('tsconfig-paths');
            const stripJsonComments = require('strip-json-comments');
            const tsconfig = JSON.parse(
                stripJsonComments(
                    readFileSync(path.resolve(wallaby.localProjectDir, 'tsconfig.json'), { encoding: 'utf-8' })
                )
            );
            tsConfigPaths.register({
                baseUrl: tsconfig.compilerOptions.baseUrl,
                paths: tsconfig.compilerOptions.paths
            });
            global._tsconfigPathsRegistered = true;
        }
    };
};
