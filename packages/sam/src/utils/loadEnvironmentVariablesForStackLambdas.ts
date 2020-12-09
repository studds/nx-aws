import CloudFormation from 'aws-sdk/clients/cloudformation';
import Lambda from 'aws-sdk/clients/lambda';

// force AWS SDK to load config, in case region is set there
process.env.AWS_SDK_LOAD_CONFIG = '1';

export async function loadEnvironmentVariablesForStackLambdas(
    stackName: string
) {
    const cf = new CloudFormation();
    const lambda = new Lambda();

    const stackDesc = await cf
        .describeStackResources({ StackName: stackName })
        .promise();

    const stackResources = stackDesc.StackResources;
    if (!stackResources) {
        return {};
    }

    const envVars: Record<string, string> = {};

    for (const resource of stackResources) {
        if (resource.ResourceType === 'AWS::Lambda::Function') {
            const id = resource.PhysicalResourceId;
            if (id) {
                const fndesc = await lambda
                    .getFunction({ FunctionName: id })
                    .promise();
                const variables = fndesc.Configuration?.Environment?.Variables;
                Object.assign(envVars, variables);
            }
        }
    }

    process.env = { ...envVars, ...process.env };

    return envVars;
}
