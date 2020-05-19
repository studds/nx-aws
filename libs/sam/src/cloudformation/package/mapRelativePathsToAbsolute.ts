import Template from 'cloudform-types/types/template';
import { resolve } from 'path';
import { existsSync } from 'fs';

interface ResourcePropertiesToMap {
    properties: string[];
    skip: boolean;
}

const MAPPINGS: Record<string, ResourcePropertiesToMap | undefined> = {
    'AWS::ApiGateway::RestApi': { properties: ['BodyS3Location'], skip: false },
    'AWS::Lambda::Function': { properties: ['Code'], skip: true },
    'AWS::Serverless::Function': { properties: ['CodeUri'], skip: true },
    'AWS::AppSync::GraphQLSchema': {
        properties: ['DefinitionS3Location'],
        skip: false
    },
    'AWS::AppSync::Resolver': {
        properties: [
            'RequestMappingTemplateS3Location',
            'ResponseMappingTemplateS3Location'
        ],
        skip: false
    },
    'AWS::Serverless::Api': { properties: ['DefinitionUri'], skip: false },
    'AWS::Include': { properties: ['Location'], skip: false },
    'AWS::ElasticBeanstalk::ApplicationVersion': {
        properties: ['SourceBundle'],
        skip: false
    },
    'AWS::CloudFormation::Stack': { properties: ['TemplateURL'], skip: false },
    'AWS::Serverless::Application': { properties: ['Location'], skip: false },
    'AWS::Glue::Job': { properties: ['Command.ScriptLocation'], skip: false }
};

export function mapRelativePathsToAbsolute(
    template: Template,
    inputDir: string
) {
    const resources = template.Resources;
    if (!resources) {
        return;
    }
    for (const name in resources) {
        if (resources.hasOwnProperty(name)) {
            const resource = resources[name];
            const properties = resource.Properties;
            const mapping = MAPPINGS[resource.Type];
            if (mapping && properties && !mapping.skip) {
                mapping.properties.forEach(property => {
                    const value = properties[property];
                    if (typeof value === 'string') {
                        const path = resolve(inputDir, value);
                        if (existsSync(path)) {
                            console.log(
                                `Remapping ${property} for ${name} to ${path}`
                            );
                            properties[property] = path;
                        }
                    }
                });
            }
        }
    }
}
