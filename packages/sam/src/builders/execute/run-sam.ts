import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import { SamExecuteBuilderOptions } from './options';
import { from, Observable } from 'rxjs';
import { runCloudformationCommand } from '../cloudformation/run-cloudformation-command';

export function runSam(
    options: SamExecuteBuilderOptions,
    context: BuilderContext,
    templatePath: string
): Observable<BuilderOutput> {
    return from(
        runCloudformationCommand(
            {
                template: templatePath,
                host: options.host,
                port: options.port,
                parameterOverrides: options.parameterOverrides,
                args: options.args,
            },
            context,
            ['local', 'start-api']
        )
    );
}
