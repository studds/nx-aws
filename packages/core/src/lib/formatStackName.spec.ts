import { formatStackName, interpolate$KeyWithValue } from "./formatStackName";

// TODO: would also be nice to throw an error if we do not actually replace the stack format name
describe('formatStackName', () => {
    it('defaults to projectName-dev', () => {
        const result = formatStackName('api', undefined, undefined)
        expect(result).toEqual('api-dev')
    })

    it('allows you to pass  a custom formatStackName', () => {
        const stackFormatName = `$PROJECT-$ENVIRONMENT-$ENVIRONMENT-$PROJECT-$FOO`
        const result = formatStackName('api', stackFormatName, undefined, {FOO: 'bar'})
        expect(result).toEqual('api-dev-dev-api-bar')
    })

    // TODO: it would be better if the stackNameFormat had a hard word boundary to match on
    it('sorts by descending length to prevent partial match', () => {
        const result = formatStackName('api', `$FOOB`, undefined, {FOO: 'foo', FOOB: 'foo'})
        expect(result).toEqual('foo')
    })

    describe('interpolate env var into a string via a regex looking for $EXPRESSION', () => {
        it(`interpolates $PROJECT to equal the project name eg API, the new string can be further interpolated`, () => {
            const result = interpolate$KeyWithValue('$PROJECT-$ENVIRONMENT', 'PROJECT', 'api')
            expect(result).toBe('api-$ENVIRONMENT')

            const result2 = interpolate$KeyWithValue(result, 'ENVIRONMENT', 'prod')
            expect(result2).toBe('api-prod')
        })

        it('returns the original string if the interpolation key does not match exactly', () => {
            const result = interpolate$KeyWithValue('$PROJECT-$ENVIRONMENT','$ENVIRONMENT', 'prod')
            expect(result).toEqual('$PROJECT-$ENVIRONMENT')

            const result2= interpolate$KeyWithValue('$PROJECT-$ENVIRONMENT', 'ENVIRONMENTA', 'prod')
            expect(result2).toEqual('$PROJECT-$ENVIRONMENT')
        })
    })
})
