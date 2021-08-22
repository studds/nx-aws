import { BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { underscore } from '@angular-devkit/core/src/utils/strings';
import { ImportStackOutputs, OutputValueRetriever } from '@nx-aws/core';
import { IParameterOverrides } from '../builders/cloudformation/deploy/IParameterOverrides';
import { loadCloudFormationTemplate } from './load-cloud-formation-template';

export async function getParameterOverrides(
    options: {
        templateFile: string;
        importStackOutputs: (ImportStackOutputs & JsonObject) | null;
        parameterOverrides: IParameterOverrides | null;
    },
    context: BuilderContext,
    stackSuffix: string | undefined
): Promise<IParameterOverrides> {
    const cf = loadCloudFormationTemplate(options.templateFile);
    const parameters = cf.Parameters;
    if (!parameters) {
        return {};
    }
    const importStackOutputs = options.importStackOutputs;
    const overrides: IParameterOverrides = {};
    if (importStackOutputs) {
        const outputValueRetriever = new OutputValueRetriever();
        // retrieve the values from the other projects
        const values = await outputValueRetriever.getOutputValues(
            importStackOutputs,
            context,
            stackSuffix
        );
        options.parameterOverrides = {
            ...(options.parameterOverrides || {}),
            ...values,
        };
    }
    for (const key in parameters) {
        if (Object.prototype.hasOwnProperty.call(parameters, key)) {
            if (
                options.parameterOverrides &&
                Object.prototype.hasOwnProperty.call(
                    options.parameterOverrides,
                    key
                )
            ) {
                overrides[key] = options.parameterOverrides[key];
            } else {
                const envKey = underscore(key).toUpperCase();
                const value = process.env[envKey];
                if (value) {
                    context.logger.info(
                        `Retrieved parameter override ${key} from environment variable ${envKey}`
                    );
                    overrides[key] = value;
                } else if (!parameters[key].Default) {
                    context.logger.fatal(
                        `Missing parameter override ${key}; deploy will likely fail`
                    );
                }
            }
        }
    }
    return overrides;
}
