
// TODO: I don't think stackFormatName is passed in anywhere, maybe remove?
export function formatStackName(
    projectName: string,
    stackNameFormat = '$PROJECT-$ENVIRONMENT',
    environmentName = 'dev',
    processEnv = process.env
): string {

    const env = {
        PROJECT: projectName,
        ENVIRONMENT: environmentName,
        ...processEnv
    };

    return Object.entries(env)
        .sort(keyByLength) // sort by descending length to prevent partial replacement
        .reduce((stackNameFormatAcc, [envKey, envValue]) => {
            return interpolate$KeyWithValue(stackNameFormatAcc, envKey, envValue)
        }, stackNameFormat)
}

export function interpolate$KeyWithValue(stringToReplace: string, key: string,  value: string): string {
    const regex = new RegExp(`\\$${key}`, 'g');
    return stringToReplace.replace(regex, value);
}

function keyByLength(a: string[], b: string[]): number {
    // [0] is the key for Object.entries
    return b[0].length - a[0].length
}
