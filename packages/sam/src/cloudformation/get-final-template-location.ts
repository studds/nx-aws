import { sync as mkdirpSync } from 'mkdirp';
import { parse } from 'path';
import { resolve } from 'path';
/**
 *
 * Get the destination where we'll copy the template
 *
 * @param outputTemplateFile
 * @param templateFile
 */
export function getFinalTemplateLocation(
    outputTemplateFile: string,
    templateFile: string
) {
    const dir = parse(outputTemplateFile).dir;
    mkdirpSync(dir);
    const base = parse(templateFile).base;
    const finalTemplateLocation = resolve(dir, base);
    return finalTemplateLocation;
}
