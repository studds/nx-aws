import { watch } from 'cpx';
import { resolve } from 'path';
import yargs from 'yargs';

const { projectPath } = yargs
    .option('projectPath', {
        type: 'string',
        description:
            'The path to the destination project (ie. the directory where I can find node_modules)',
        required: true,
    })
    .parse();

const srcPath = './dist/packages/**/*';
const destPath = resolve(projectPath, 'node_modules', '@nx-aws');

console.log(`Copying files from ${srcPath} to ${destPath}`);

watch(srcPath, destPath, {
    clean: false,
})
    .on('copy', (e) => console.log(`copied ${e.srcPath} to ${e.dstPath}`))
    .on('remove', (e) => console.log(`removed ${e.path}`))
    .on('watch-ready', () => console.log(`watching ${srcPath}`))
    .on('watch-error', () => console.log(`error watching ${srcPath}`));
