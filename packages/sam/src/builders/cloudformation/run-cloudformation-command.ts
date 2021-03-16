import { JsonObject } from '@angular-devkit/core';
import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import { spawn } from 'cross-spawn';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { CloudFormationDeployOptions } from './deploy/CloudFormationDeployOptions';

export function runCloudformationCommand(
    options: JsonObject | CloudFormationDeployOptions,
    context: BuilderContext,
    subcommand: string | string[]
) {
    return new Promise<BuilderOutput>((resolve) => {
        const args: string[] = Array.isArray(subcommand)
            ? subcommand
            : [subcommand];
        Object.keys(options).forEach((arg) => {
            const value = (options as any)[arg];
            if (value) {
                if (Array.isArray(value)) {
                    if (arg === 'args') {
                        args.push(...value);
                    } else {
                        args.push(`--${dasherize(arg)}`);
                        // todo: avoid this cast to Array<string>
                        args.push(...(value as Array<string>));
                    }
                } else if (typeof value === 'object') {
                    const keys = Object.keys(value);
                    if (keys.length > 0) {
                        args.push(`--${dasherize(arg)}`);
                        keys.forEach((key) => {
                            // todo: avoid this cast to any
                            args.push(`${key}="${(value as any)[key]}"`);
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
        context.reportStatus(`Executing "${command} ${args.join(' ')}"...`);
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
