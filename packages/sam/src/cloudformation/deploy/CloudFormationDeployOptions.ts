import { IParameterOverrides, Capability } from './deploy';
export interface CloudFormationDeployOptions {
    parameterOverrides: IParameterOverrides;
    noFailOnEmptyChangeset: true;
    region: string | null;
    capabilities: Capability[] | null;
    templateFile: string;
    stackName: string | null;
    s3Bucket: string;
    s3Prefix: string | null;
}
