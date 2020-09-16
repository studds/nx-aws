import {
    LambdaEnvironmentVariables,
    parseEnvironmentVariables,
} from './parseEnvironmentVariables';
import { CloudWatchLogsEvent } from 'aws-lambda';

export interface BaseLambdaConfig<EV extends string> {
    environmentVariables: readonly EV[];
}

interface BaseLambdaParameters<EV extends string> {
    env: LambdaEnvironmentVariables<EV>;
}

interface CloudWatchLogsEventLambdaParams<EV extends string>
    extends BaseLambdaParameters<EV> {
    event: CloudWatchLogsEvent;
}

export interface CloudWatchLogsEventLambdaConfig<EV extends string>
    extends BaseLambdaConfig<EV> {
    type: 'CloudWatchLogs';
    handler: (params: CloudWatchLogsEventLambdaParams<EV>) => Promise<void>;
}

type LambdaConfig<EV extends string> = CloudWatchLogsEventLambdaConfig<EV>;

export const lambda = <EV extends string>(config: LambdaConfig<EV>) => {
    const env = parseEnvironmentVariables(config.environmentVariables);
    return (event: CloudWatchLogsEvent) => {
        return config.handler({ event, env });
    };
};
