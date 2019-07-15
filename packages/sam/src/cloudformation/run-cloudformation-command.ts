import { JsonObject } from '@angular-devkit/core';
import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import * as childProcess from 'child_process';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

export function runCloudformationCommand(
    options: JsonObject,
    context: BuilderContext,
    subcommand: string
) {
    return new Promise<BuilderOutput>((resolve, reject) => {
        const args: string[] = ['cloudformation', subcommand];
        Object.keys(options).forEach(arg => {
            const value = options[arg];
            if (value) {
                args.push(`--${dasherize(arg)}`);
                if (Array.isArray(value)) {
                    // todo: avoid this cast to Array<string>
                    args.push(...(value as Array<string>));
                } else if (typeof value === 'object') {
                    Object.keys(value).forEach(key => {
                        // todo: avoid this cast to any
                        args.push(`${key}=${(value as any)[key]}`);
                    });
                } else if (typeof value === 'boolean') {
                    // do nothing - just including the flag is all that's required
                } else {
                    args.push(`${value}`);
                }
            }
        });
        const command = `aws`;
        context.reportStatus(`Executing "${command} ${args[0]} ${args[1]}"...`);
        const child = childProcess.spawn(command, args, {
            stdio: 'pipe',
            env: process.env
        });

        child.stdout.on('data', data => {
            context.logger.info(data.toString());
        });
        child.stderr.on('data', data => {
            context.logger.error(data.toString());
            reject();
        });

        context.reportStatus(`Done.`);
        child.on('close', code => {
            resolve({ success: code === 0 });
        });
    });
}
