import { parse, join } from 'path';
import { SamFunctionProperties } from './SamFunctionProperties';

export function getLambdaSourcePath(
    templatePath: string,
    resourceName: string,
    properties: Partial<SamFunctionProperties>,
    globalProperties?: Pick<
        Partial<SamFunctionProperties>,
        'CodeUri' | 'Handler'
    >
): { src: string; dir: string; functionName: string } {
    const { dir } = parse(templatePath);
    // fallback to global CodeUri if function doesn't specify one
    const codeUri = properties.CodeUri || globalProperties?.CodeUri;
    // fallback to global Handler if function doesn't specify one
    const handler = properties.Handler || globalProperties?.Handler;

    if (!codeUri) {
        throw new Error(`Property CodeUri was missing on ${resourceName}`);
    }
    if (typeof handler !== 'string') {
        throw new Error(
            `Property Handler was missing or malformed on ${resourceName}`
        );
    }
    const handlerParts = handler.split('.');
    const functionName = handlerParts.pop();
    if (!functionName) {
        throw new Error(
            `Property Handler did not contain the function name: ${handler}`
        );
    }
    const fileName = [...handlerParts, 'ts'].join('.');
    const filePath = join(codeUri, fileName);
    const src = join(dir, filePath);
    return { src, dir, functionName };
}
