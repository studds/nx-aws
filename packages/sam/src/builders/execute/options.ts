import { JsonObject } from '@angular-devkit/core';

export interface SamExecuteBuilderOptions extends JsonObject {
    args: string[];
    waitUntilTargets: string[];
    buildTarget: string;
    packageTarget: string;
    host: string;
    port: number;
    mimicEnv: string;
}
