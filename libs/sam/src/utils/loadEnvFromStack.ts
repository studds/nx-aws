import { Observable, of, from } from 'rxjs';
import { formatStackName } from '@nx-aws/core';
import { loadEnvironmentVariablesForStackLambdas } from './loadEnvironmentVariablesForStackLambdas';
export function loadEnvFromStack(
    mimicEnv: string | undefined,
    project: string | undefined
): Observable<Record<string, string>> {
    if (mimicEnv && project) {
        const stackName = formatStackName(project, undefined, mimicEnv);
        console.log(`Getting environment variables for ${stackName}`);
        return from(loadEnvironmentVariablesForStackLambdas(stackName));
    }
    return of({});
}
