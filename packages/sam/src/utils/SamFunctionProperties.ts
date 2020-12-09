import { FunctionProperties } from 'cloudform-types/types/lambda/function';

export interface SamFunctionProperties extends FunctionProperties {
    CodeUri?: string;
}
