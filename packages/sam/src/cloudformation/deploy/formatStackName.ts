export function formatStackName(
    projectName: string,
    stackNameFormat: string = '$PROJECT-$ENVIRONMENT',
    environmentName: string = 'dev'
): string {
    const env = {
        PROJECT: projectName,
        ENVIRONMENT: environmentName,
        ...process.env
    };
    type EnvKey = keyof typeof env;
    // sort by descending length to prevent partial replacement
    const envKeys: EnvKey[] = Object.keys(env).sort(
        (a, b) => b.length - a.length
    ) as EnvKey[];
    envKeys.forEach(key => {
        const value = env[key];
        if (!value) {
            return;
        }
        const regex = new RegExp(`\\$${key}|%${key}%`, 'ig');
        stackNameFormat = stackNameFormat.replace(regex, value);
    });
    return stackNameFormat;
}
