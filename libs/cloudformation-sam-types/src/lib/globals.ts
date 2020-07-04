export type GlobalsTemplate = {Globals?: Globals};
export type Globals = IGlobals;

/**
 * Partial list of supported properties for the Globals property
 * @since 0.7.0
 */
interface IGlobals {
    Function?: IFunction;
}

/**
 * Partial list of supported values the Function attribute of the Globals property
 *
 * @since 0.7.0
 */
interface IFunction {
    Handler?: string;
    CodeUri?: string | {
        Bucket: string
        Key: string
        Version: string
    };
}
