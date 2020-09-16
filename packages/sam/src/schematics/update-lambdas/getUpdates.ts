import {
    ArrayLiteralExpression,
    createSourceFile,
    Declaration,
    getCombinedModifierFlags,
    isArrayLiteralExpression,
    isCallExpression,
    isIdentifier,
    isObjectLiteralExpression,
    isPropertyAssignment,
    isVariableStatement,
    ModifierFlags,
    Node,
    ObjectLiteralExpression,
    ScriptTarget,
    SourceFile,
    VariableDeclaration,
} from 'typescript';

export interface Replacement {
    start: number;
    end: number;
    replacement: string;
}

interface GetUpdatesInput {
    fileName: string;
    sourceText: string;
    functionName: string;
    targetConfig: {
        environmentVariables: string[];
    };
}

export function getUpdates({
    fileName,
    sourceText,
    functionName,
    targetConfig,
}: GetUpdatesInput): Replacement[] {
    // Build a program using the set of root file names in fileNames
    const sourceFile = createSourceFile(
        fileName,
        sourceText,
        ScriptTarget.Latest
    );
    const config = getConfigObject(sourceFile, functionName);
    const environmentVariables = getEnvironmentVariablesArray(
        config,
        functionName
    );
    return [
        {
            start: environmentVariables.getStart(sourceFile),
            end: environmentVariables.getEnd(),
            replacement: `[${targetConfig.environmentVariables
                .map((e) => `'${e}'`)
                .join(',')}]`,
        },
    ];
}

function getEnvironmentVariablesArray(
    config: ObjectLiteralExpression,
    lambdaName: string
) {
    let environmentVariables: ArrayLiteralExpression | undefined;
    config.properties.forEach((prop) => {
        if (
            prop.name &&
            isIdentifier(prop.name) &&
            prop.name.text === 'environmentVariables' &&
            isPropertyAssignment(prop)
        ) {
            if (isArrayLiteralExpression(prop.initializer)) {
                environmentVariables = prop.initializer;
            }
        }
    });
    if (!environmentVariables) {
        throw new Error(
            `Did not find environmentVariables array on config for ${lambdaName}`
        );
    }
    return environmentVariables;
}

function getConfigObject(sourceFile: SourceFile, lambdaName: string) {
    const exportedVariable = findExportedVariable(sourceFile, lambdaName); //?
    if (!exportedVariable) {
        throw new Error(
            `Expected to find an exported variable with name ${lambdaName}`
        );
    }
    const lambdaCall = exportedVariable.initializer;
    if (!lambdaCall || !isCallExpression(lambdaCall)) {
        throw new Error(`${lambdaName} should be a call expression to lambda`);
    }
    const config = lambdaCall.arguments[0];
    if (!isObjectLiteralExpression(config)) {
        throw new Error(
            `First argument of ${lambdaName} should be the lambda configuration object literal`
        );
    }
    return config;
}

function findExportedVariable(sourceFile: SourceFile, name: string) {
    let variableDeclaration: VariableDeclaration | undefined;
    sourceFile.forEachChild((needle) => {
        if (
            isNodeExported(needle) &&
            isVariableStatement(needle) &&
            isIdentifier(needle.declarationList.declarations[0].name) &&
            needle.declarationList.declarations[0].name.text === name
        ) {
            variableDeclaration = needle.declarationList.declarations[0];
        }
    });
    return variableDeclaration;
}

/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: Node): boolean {
    return (
        (getCombinedModifierFlags(node as Declaration) &
            ModifierFlags.Export) !==
        0
    );
}
