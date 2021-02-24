import {
    LambdaEnvironmentVariables,
    parseEnvironmentVariables,
} from './parseEnvironmentVariables';
import { CloudWatchLogsEvent, APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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

interface HttpApiEventLambdaParams<EV extends string>
    extends BaseLambdaParameters<EV> {
    event: APIGatewayProxyEventV2;
}

export interface HttpApiEventLambdaConfig<EV extends string>
    extends BaseLambdaConfig<EV> {
    type: 'HttpApi';
    handler: (params: HttpApiEventLambdaParams<EV>) => Promise<APIGatewayProxyStructuredResultV2>;
}

interface ApiEventLambdaParams<EV extends string>
    extends BaseLambdaParameters<EV> {
    event: APIGatewayProxyEvent;
}

export interface ApiEventLambdaConfig<EV extends string>
    extends BaseLambdaConfig<EV> {
    type: 'Api';
    handler: (params: ApiEventLambdaParams<EV>) => Promise<APIGatewayProxyResult>;
}

type LambdaConfig<EV extends string> = CloudWatchLogsEventLambdaConfig<EV> | HttpApiEventLambdaConfig<EV> | ApiEventLambdaConfig<EV>;

export const lambda = <EV extends string>(config: LambdaConfig<EV>) => {
    const env = parseEnvironmentVariables(config.environmentVariables);
    return (event: any) => {
        return config.handler({ event, env });
    };
};
