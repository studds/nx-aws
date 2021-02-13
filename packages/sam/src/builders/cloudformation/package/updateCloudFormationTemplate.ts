import { BuilderContext } from '@angular-devkit/architect';
import Template from 'cloudform-types/types/template';
import { parse } from 'path';
import { mapRelativePathsToAbsolute } from './mapRelativePathsToAbsolute';
import { IPackageOptions } from './package';
import { replaceProjectReferenceWithPath } from './replaceProjectReferenceWithPath';

export async function updateCloudFormationTemplate(
    cloudFormation: Template,
    context: BuilderContext,
    options: Pick<IPackageOptions, 'templateFile'>
): Promise<void> {
    await replaceProjectReferenceWithPath(cloudFormation, context);
    const inputPath = parse(options.templateFile).dir;
    mapRelativePathsToAbsolute(cloudFormation, inputPath);
}
