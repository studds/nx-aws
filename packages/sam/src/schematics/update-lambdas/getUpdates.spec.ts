import { getUpdates } from './getUpdates';

describe('getUpdates', () => {
    it('should return the correct replacement for environment variables', () => {
        const sourceText = `export const demo = lambda({environmentVariables: []});`;
        const actual = getUpdates({
            fileName: 'meow',
            functionName: 'demo',
            sourceText: sourceText,
            targetConfig: { environmentVariables: ['GOETH'] },
        });
        const start = sourceText.indexOf('[]');
        const end = start + 2;
        const replacement = `['GOETH']`;
        expect(actual).toEqual([{ start, end, replacement }]);
    });
});
