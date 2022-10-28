import {
    BuilderContext,
    createBuilder,
    BuilderOutput,
    targetFromTargetString,
    scheduleTargetAndForget,
    Target,
} from '@angular-devkit/architect';

import { Observable, of, combineLatest, from } from 'rxjs';
import { concatMap, map, tap, switchMap } from 'rxjs/operators';

import { stripIndents } from '@angular-devkit/core/src/utils/literals';
import { SamExecuteBuilderOptions } from './options';
import { runSam } from './run-sam';
import { JsonObject } from '@angular-devkit/core';
import { getFinalTemplateLocation } from '../cloudformation/get-final-template-location';
import { watch, writeFileSync } from 'fs';
import { getValidatedOptions, importDotenv } from '@nx-aws/core';
import { loadEnvFromStack } from '../../utils/loadEnvFromStack';
import { updateCloudFormationTemplate } from '../cloudformation/package/updateCloudFormationTemplate';
import { loadCloudFormationTemplate } from '../../utils/load-cloud-formation-template';
import { dumpCloudformationTemplate } from '../../utils/dumpCloudformationTemplate';
import { getParameterOverrides } from '../../utils/getParameterOverrides';

importDotenv();

export const enum InspectType {
    Inspect = 'inspect',
    InspectBrk = 'inspect-brk',
}

export default createBuilder<SamExecuteBuilderOptions>(
    nodeExecuteBuilderHandler
);

export function nodeExecuteBuilderHandler(
    options: SamExecuteBuilderOptions,
    context: BuilderContext
): Observable<BuilderOutput> {
    const project = context.target?.project;
    return loadEnvFromStack(options.mimicEnv, project).pipe(
        switchMap(() => runWaitUntilTargets(options)),
        concatMap((v): Observable<BuilderOutput> => {
            if (!v.success) {
                context.logger.error(
                    `One of the tasks specified in waitUntilTargets failed`
                );
                return of({ success: false });
            }
            return startBuild(options, context);
        })
    );
}

function startBuild(
    options: SamExecuteBuilderOptions,
    context: BuilderContext
): Observable<BuilderOutput> {
    const buildTarget = targetFromTargetString(options.buildTarget);
    return getBuilderOptions(options, context).pipe(
        concatMap((builderOptions): Observable<BuilderOutput> => {
            const template = builderOptions.template;
            if (typeof template !== 'string') {
                throw new Error(
                    'Builder options was missing template property'
                );
            }
            return copyTemplate(options, context, template).pipe(
                switchMap((finalTemplateLocation) =>
                    from(
                        getParameterOverrides(
                            { ...options, templateFile: template },
                            context,
                            undefined
                        )
                    ).pipe(
                        map((parameterOverrides) => ({
                            finalTemplateLocation,
                            parameterOverrides,
                        }))
                    )
                ),
                switchMap(({ finalTemplateLocation, parameterOverrides }) => {
                    return startBuildImpl(
                        { ...options, parameterOverrides },
                        context,
                        finalTemplateLocation,
                        buildTarget
                    );
                })
            );
        })
    );
}

function startBuildImpl(
    options: SamExecuteBuilderOptions,
    context: BuilderContext,
    template: string,
    buildTarget: Target
) {
    const sam$ = runSam(options, context, template);
    // todo: it would be nice to wait until the first successful completion of build$ before triggering sam$
    const build$ = scheduleTargetAndForget(context, buildTarget, {
        watch: true,
    });
    return combineLatest([sam$, build$]).pipe(
        map(([samResult, buildResult]): BuilderOutput => {
            if (!samResult.success || !buildResult.success) {
                context.logger.error(
                    'There was an error with the build. See above.'
                );
                return { success: false };
            }
            return { success: true };
        })
    );
}

function getBuilderOptions(
    options: SamExecuteBuilderOptions,
    context: BuilderContext
) {
    const targetName = options.buildTarget;
    const validateOptions = getValidatedOptions(targetName, context);
    return validateOptions.pipe(
        tap((builderOptions) => {
            if (builderOptions.optimization) {
                context.logger.warn(stripIndents`
                ************************************************
                This is a simple process manager for use in
                testing or debugging Node applications locally.
                DO NOT USE IT FOR PRODUCTION!
                You should look into proper means of deploying
                your node application to production.
                ************************************************`);
            }
        })
    );
}

function getPackageOptions(
    options: SamExecuteBuilderOptions,
    context: BuilderContext
): Observable<JsonObject> {
    return getValidatedOptions(options.packageTarget, context, false);
}

function copyTemplate(
    options: SamExecuteBuilderOptions,
    context: BuilderContext,
    templateFile: string
): Observable<string> {
    return watchTemplate(context, templateFile).pipe(
        switchMap(() => {
            return getDestinationTemplatePath(
                options,
                context,
                templateFile
            ).pipe(
                switchMap((finalTemplateLocation) => {
                    return from(
                        updateTemplate(
                            templateFile,
                            context,
                            finalTemplateLocation
                        )
                    );
                })
            );
        })
    );
}

async function updateTemplate(
    templateFile: string,
    context: BuilderContext,
    finalTemplateLocation: string
): Promise<string> {
    const template = loadCloudFormationTemplate(templateFile);
    await updateCloudFormationTemplate(template, context, {
        templateFile,
    });
    writeFileSync(finalTemplateLocation, dumpCloudformationTemplate(template), {
        encoding: 'utf-8',
    });
    return finalTemplateLocation;
}

function watchTemplate(
    context: BuilderContext,
    templateFile: string
): Observable<void> {
    return new Observable((subscriber) => {
        // initial emit to get everything moving
        subscriber.next();
        const listener = () => {
            context.logger.info(`${templateFile} changed, restarting build`);
            return subscriber.next();
        };
        const watcher = watch(templateFile, listener);
        () => {
            watcher.close();
        };
    });
}

function getDestinationTemplatePath(
    options: SamExecuteBuilderOptions,
    context: BuilderContext,
    templateFile: string
): Observable<string> {
    return getPackageOptions(options, context).pipe(
        map((packageOptions: JsonObject): string => {
            if (typeof packageOptions.outputTemplateFile !== 'string') {
                throw new Error(
                    'Package options were missing outputTemplateFile'
                );
            }
            return getFinalTemplateLocation(
                packageOptions.outputTemplateFile,
                templateFile
            );
        })
    );
}

function runWaitUntilTargets(
    options: SamExecuteBuilderOptions
): Observable<BuilderOutput> {
    if (!options.waitUntilTargets || options.waitUntilTargets.length === 0) {
        return of({ success: true });
    }

    throw new Error('Unimplemented - need to get the updated way to do this.');
}
