import { RequiredKeys, OptionalKeys } from 'ts-essentials';
import { getOwnStringProperties } from '../utils/guards';

/**
 * see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
 */
interface ReserverLambdaEnvironmentVariables {
    /**
     * The handler location configured on the function.
     */
    _HANDLER: string;
    /**
     *  The AWS Region where the Lambda function is executed.
     */
    AWS_REGION: string;
    /**
     * The runtime identifier, prefixed by AWS_Lambda_—for example, AWS_Lambda_java8.
     */
    AWS_EXECUTION_ENV: string;
    /**
     * The name of the function.
     */
    AWS_LAMBDA_FUNCTION_NAME: string;
    /**
     * The amount of memory available to the function in MB.
     */
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: string;
    /**
     * The version of the function being executed.
     */
    AWS_LAMBDA_FUNCTION_VERSION: string;
    /**
     * The name of the Amazon CloudWatch Logs group for the function.
     */
    AWS_LAMBDA_LOG_GROUP_NAME: string;
    /**
     * The name of the Amazon CloudWatch Logs stream for the function.
     */
    AWS_LAMBDA_LOG_STREAM_NAME: string;
    /**
     * The access keys obtained from the function's execution role.
     */
    AWS_ACCESS_KEY_ID: string;
    /**
     * The access keys obtained from the function's execution role.
     */
    AWS_SECRET_ACCESS_KEY: string;
    /**
     * The access keys obtained from the function's execution role.
     */
    AWS_SESSION_TOKEN: string;
    /**
     * (Custom runtime) The host and port of the runtime API.
     */
    AWS_LAMBDA_RUNTIME_API?: string;
    /**
     * The path to your Lambda function code.
     */
    LAMBDA_TASK_ROOT: string;
    /**
     * The path to runtime libraries.
     */
    LAMBDA_RUNTIME_DIR: string;
    /**
     * The environment's time zone (UTC). The execution environment uses NTP to synchronize the system clock.
     */
    TZ: string;
}

/**
 * see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
 */
interface UnreservedLambdaEnvironmentVariables {
    /**
     * The locale of the runtime (en_US.UTF-8).
     */
    LANG: string;
    /**
     * The execution path (/usr/local/bin:/usr/bin/:/bin:/opt/bin).
     */
    PATH: string;
    /**
     * The system library path (/lib64:/usr/lib64:$LAMBDA_RUNTIME_DIR:$LAMBDA_RUNTIME_DIR/lib:$LAMBDA_TASK_ROOT:$LAMBDA_TASK_ROOT/lib:/opt/lib).
     */
    LD_LIBRARY_PATH: string;
    /**
     * (Node.js) The Node.js library path (/opt/nodejs/node12/node_modules/:/opt/nodejs/node_modules:$LAMBDA_RUNTIME_DIR/node_modules).
     */
    NODE_PATH: string;
    /**
     * The X-Ray tracing header.
     */
    _X_AMZN_TRACE_ID?: string;
    /**
     * For X-Ray tracing, Lambda sets this to LOG_ERROR to avoid throwing runtime errors from the X-Ray SDK.
     */
    AWS_XRAY_CONTEXT_MISSING?: string;
    /**
     * For X-Ray tracing, the IP address and port of the X-Ray daemon.
     */
    AWS_XRAY_DAEMON_ADDRESS?: string;
}

/**
 * see: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
 * note: only includes node env variables, not eg. python / ruby
 */
type CoreLambdaEnvironmentVariables = ReserverLambdaEnvironmentVariables &
    UnreservedLambdaEnvironmentVariables;

type RequiredEnvVariableName = RequiredKeys<CoreLambdaEnvironmentVariables>;
type OptionalEnvVariableName = OptionalKeys<CoreLambdaEnvironmentVariables>;

export type LambdaEnvironmentVariables<
    EV extends string
> = CoreLambdaEnvironmentVariables & { [key in EV]: string };

const requiredEnvVariables = getRequiredKeys();
const optionalEnvVariables = getOptionalKeys();

export function parseEnvironmentVariables<K extends string>(
    keys: readonly K[]
): LambdaEnvironmentVariables<K> {
    return getOwnStringProperties({
        keys: [...requiredEnvVariables, ...keys],
        optionalKeys: optionalEnvVariables,
        object: process.env,
    });
}

function getRequiredKeys(): RequiredEnvVariableName[] {
    const dummy: Record<RequiredEnvVariableName, true> = {
        AWS_ACCESS_KEY_ID: true,
        AWS_EXECUTION_ENV: true,
        AWS_LAMBDA_FUNCTION_MEMORY_SIZE: true,
        AWS_LAMBDA_FUNCTION_NAME: true,
        AWS_LAMBDA_FUNCTION_VERSION: true,
        AWS_LAMBDA_LOG_GROUP_NAME: true,
        AWS_LAMBDA_LOG_STREAM_NAME: true,
        AWS_REGION: true,
        AWS_SECRET_ACCESS_KEY: true,
        AWS_SESSION_TOKEN: true,
        LAMBDA_RUNTIME_DIR: true,
        LAMBDA_TASK_ROOT: true,
        LANG: true,
        LD_LIBRARY_PATH: true,
        NODE_PATH: true,
        PATH: true,
        TZ: true,
        _HANDLER: true,
    };
    return Object.getOwnPropertyNames(dummy) as RequiredEnvVariableName[];
}
function getOptionalKeys(): OptionalEnvVariableName[] {
    const dummy: Record<OptionalEnvVariableName, true> = {
        AWS_LAMBDA_RUNTIME_API: true,
        AWS_XRAY_CONTEXT_MISSING: true,
        AWS_XRAY_DAEMON_ADDRESS: true,
        _X_AMZN_TRACE_ID: true,
    };
    return Object.getOwnPropertyNames(dummy) as OptionalEnvVariableName[];
}
