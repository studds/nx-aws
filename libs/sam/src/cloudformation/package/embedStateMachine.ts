import Template from 'cloudform-types/types/template';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import stripJsonComments from 'strip-json-comments';
import { getTag } from '../../utils/getTag';
import { Type } from 'js-yaml';

export function embedStateMachine(
    cloudFormation: Template,
    templateLocation: string
) {
    const resources = cloudFormation.Resources;
    if (!resources) {
        return;
    }
    for (const key in resources) {
        if (resources.hasOwnProperty(key)) {
            const element = resources[key];
            if (
                element.Type === 'AWS::StepFunctions::StateMachine' &&
                element.Properties &&
                'DefinitionUri' in element.Properties &&
                typeof element.Properties.DefinitionUri === 'string'
            ) {
                const definitionUri = element.Properties.DefinitionUri;
                const json = stripJsonComments(
                    readFileSync(resolve(templateLocation, definitionUri), {
                        encoding: 'utf-8'
                    })
                );
                const replacements: Record<string, Type> = {};
                const subBody = [json, replacements];
                const matches = json.match(/\${[^${}}]+}/g);
                if (matches) {
                    const lambdaNames = matches.map(match => {
                        return match.slice(2, -1);
                    });
                    const invalid = lambdaNames.filter(
                        name =>
                            !(name in resources) ||
                            !resources[name].Type.includes('Function')
                    );
                    if (invalid.length > 0) {
                        throw new Error(
                            `Expected to find function for ${invalid}`
                        );
                    }
                    lambdaNames.forEach(name => {
                        replacements[name] = getTag('GetAtt', `${name}.Arn`);
                    });
                }
                const definitionString = getTag('Sub', subBody);
                delete element.Properties.DefinitionUri;
                element.Properties.DefinitionString = definitionString;
            }
        }
    }
}
