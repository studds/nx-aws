import { CloudFormation } from 'aws-sdk';
import { formatStackName } from './formatStackName';
import { getValidatedOptions } from './getValidatedOptions';
import { BuilderContext } from '@angular-devkit/architect';
import { ImportStackOutputs } from './ImportStackOutputs';

export class OutputValueRetriever {
    private cfCache: Record<string, CloudFormation> = {};
    private regionByTarget: Record<string, string | undefined> = {};
    private outputCache: Record<string, CloudFormation.Outputs> = {};

    async getOutputValues(
        importStackOutputs: ImportStackOutputs,
        context: BuilderContext,
        stackSuffix: string | undefined
    ) {
        const values: Record<string, string> = {};
        const keys = Object.keys(importStackOutputs);
        for (const key of keys) {
            const element = importStackOutputs[key];
            const { targetName, outputName } = element;
            const value = await this.getOutputValue(
                targetName,
                outputName,
                context,
                stackSuffix
            );
            values[key] = value;
        }
        return values;
    }

    private async getOutputValue(
        targetName: string,
        outputName: string,
        context: BuilderContext,
        stackSuffix: string | undefined
    ) {
        const [sourceProjectName] = targetName.split(':');

        const otherStackName = formatStackName(
            sourceProjectName,
            undefined,
            stackSuffix
        );
        const outputs = await this.getStackOutputs(
            otherStackName,
            targetName,
            context
        );
        const output = outputs.find(
            o =>
                o.OutputKey &&
                o.OutputKey.toLowerCase() === outputName.toLowerCase()
        );
        if (!output) {
            throw new Error(
                `Stack ${otherStackName} did not have an output called ${outputName}`
            );
        }
        const value = output.OutputValue;
        if (!value) {
            throw new Error(
                `Stack ${otherStackName} did not have a value for output called ${outputName}`
            );
        }
        return value;
    }

    private async getStackOutputs(
        otherStackName: string,
        targetName: string,
        context: BuilderContext
    ) {
        if (this.outputCache[otherStackName]) {
            return this.outputCache[otherStackName];
        }
        context.logger.info(`Retrieving outputs for ${otherStackName}...`);
        const cloudFormation = await this.getCfForProject(targetName, context);
        const describeStacksResult = await cloudFormation
            .describeStacks({ StackName: otherStackName })
            .promise();
        const stacks = describeStacksResult.Stacks;
        if (!stacks) {
            throw new Error(
                `Could not find the source stack ${otherStackName} for project ${targetName}`
            );
        }
        const outputs = stacks[0].Outputs;
        if (!outputs) {
            throw new Error(`Stack ${otherStackName} did not have any outputs`);
        }
        this.outputCache[otherStackName] = outputs;
        return outputs;
    }

    private async getCfForProject(targetName: string, context: BuilderContext) {
        const region = await this.getRegionForProject(targetName, context);
        return this.getCfForRegion(region);
    }

    private async getRegionForProject(
        targetName: string,
        context: BuilderContext
    ) {
        if (!this.regionByTarget[targetName]) {
            const options = await getValidatedOptions(
                targetName,
                context,
                false
            ).toPromise();
            const region =
                typeof options.region === 'string' ? options.region : undefined;
            this.regionByTarget[targetName] = region;
        }
        return this.regionByTarget[targetName];
    }

    private getCfForRegion(region: string | undefined) {
        const key = region || '';
        if (!this.cfCache[key]) {
            this.cfCache[key] = new CloudFormation({ region });
        }
        return this.cfCache[key];
    }
}
