import {
    BuilderContext,
    targetFromTargetString,
} from '@angular-devkit/architect';
import { Observable, from } from 'rxjs';
import { JsonObject } from '@angular-devkit/core';
export function getValidatedOptions(
    targetName: string,
    context: BuilderContext,
    validate = true
): Observable<JsonObject> {
    const target = targetFromTargetString(targetName);
    return from(
        // First we get the build options and make sure they are valid
        Promise.all([
            context.getTargetOptions(target),
            context.getBuilderNameForTarget(target),
        ]).then(async ([targetOptions, builderName]) => {
            if (!validate) {
                return targetOptions;
            }
            const validatedBuilderOptions = await context.validateOptions(
                targetOptions,
                builderName
            );
            return validatedBuilderOptions;
        })
    );
}
