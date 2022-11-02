import {
    CloudFormationClient,
    DescribeStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';

// force AWS SDK to load config, in case region is set there
process.env.AWS_SDK_LOAD_CONFIG = '1';

export async function loadEnvironmentVariablesForStackLambdas(
    stackName: string
) {
    const cf = new CloudFormationClient({});
    const lambda = new LambdaClient({});

    const stackDesc = await cf.send(
        new DescribeStackResourcesCommand({ StackName: stackName })
    );

    const stackResources = stackDesc.StackResources;
    if (!stackResources) {
        return {};
    }

    const envVars: Record<string, string> = {};

    for (const resource of stackResources) {
        if (resource.ResourceType === 'AWS::Lambda::Function') {
            const id = resource.PhysicalResourceId;
            if (id) {
                const fndesc = await lambda.send(
                    new GetFunctionCommand({ FunctionName: id })
                );
                const variables = fndesc.Configuration?.Environment?.Variables;
                Object.assign(envVars, variables);
            }
        }
    }

    process.env = { ...envVars, ...process.env };

    return envVars;
}
