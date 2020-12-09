import { JsonObject } from '@angular-devkit/core';
import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import { spawn } from 'cross-spawn';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { CloudFormationDeployOptions } from './deploy/CloudFormationDeployOptions';

export function runCloudformationCommand(
    options: JsonObject | CloudFormationDeployOptions,
    context: BuilderContext,
    subcommand: string
) {
    return new Promise<BuilderOutput>((resolve) => {
        const args: string[] = [subcommand];
        Object.keys(options).forEach((arg) => {
            const value = (options as any)[arg];
            if (value) {
                if (Array.isArray(value)) {
                    args.push(`--${dasherize(arg)}`);
                    // todo: avoid this cast to Array<string>
                    args.push(...(value as Array<string>));
                } else if (typeof value === 'object') {
                    const keys = Object.keys(value);
                    if (keys.length > 0) {
                        args.push(`--${dasherize(arg)}`);
                        keys.forEach((key) => {
                            // todo: avoid this cast to any
                            args.push(`${key}=${(value as any)[key]}`);
                        });
                    }
                } else if (typeof value === 'boolean') {
                    args.push(`--${dasherize(arg)}`);
                    // do nothing - just including the flag is all that's required
                } else {
                    args.push(`--${dasherize(arg)}`);
                    args.push(`${value}`);
                }
            }
        });
        const command = `sam`;

        context.logger.log(
            'info',
            `Executing "${command} ${args.join(' ')}"...`
        );
        context.reportStatus(`Executing "${command} ${args[0]} ${args[1]}"...`);
        const child = spawn(command, args, {
            stdio: 'inherit',
            env: process.env,
        });

        context.reportStatus(`Done.`);
        child.on('close', (code) => {
            resolve({ success: code === 0 });
        });
    });
}
