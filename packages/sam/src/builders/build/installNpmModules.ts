import { join } from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { ExtendedBuildBuilderOptions } from './build';

export function installNpmModules(
    normalizedOptions: ExtendedBuildBuilderOptions
) {
    const packageJsonPath = join(normalizedOptions.outputPath, 'package.json');
    const packagejson = JSON.parse(
        readFileSync(packageJsonPath, { encoding: 'utf-8' })
    );
    packagejson.dependencies['source-map-support'] = '*';
    writeFileSync(packageJsonPath, JSON.stringify(packagejson, null, 4), {
        encoding: 'utf-8',
    });
    execSync(
        'npm install --target=12.2.0 --target_arch=x64 --target_platform=linux --target_libc=glibc',
        {
            cwd: normalizedOptions.outputPath,
            stdio: [0, 1, 2],
        }
    );
}
