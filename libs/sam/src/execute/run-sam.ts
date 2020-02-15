import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import * as childProcess from 'child_process';
import { SamExecuteBuilderOptions } from './options';
import { Observable } from 'rxjs';

export function runSam(
    options: SamExecuteBuilderOptions,
    context: BuilderContext,
    templatePath: string
): Observable<BuilderOutput> {
    return new Observable<BuilderOutput>(subscriber => {
        const args: string[] = [
            'local',
            'start-api',
            '--template',
            templatePath
        ];
        if (options.host) {
            args.push('--host', options.host);
        }
        if (options.port) {
            args.push('--port', options.port.toFixed(0));
        }
        if (options.args) {
            args.push(...options.args);
        }
        // todo: parameter overrides
        // todo: other options

        const command = `sam`;
        context.logger.log(
            'info',
            `Executing "${command} ${args.join(' ')}"...`
        );
        const child = childProcess.spawn(command, args, {
            stdio: 'pipe',
            env: process.env
        });

        child.stdout.on('data', data => {
            context.logger.info(data.toString());
        });
        child.stderr.on('data', data => {
            context.logger.error(data.toString());
        });

        context.reportStatus(`Done.`);
        child.on('close', code => {
            subscriber.next({ success: code === 0 });
            subscriber.complete();
        });
        return () => {
            // when the observable is torn down, kill the child process
            context.logger.info(`Killing sam local: ${child.pid}`);
            child.kill();
        };
    });
}
