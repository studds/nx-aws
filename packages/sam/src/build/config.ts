import { Configuration } from 'webpack';
import webpackMerge from 'webpack-merge';
import { ExtendedBuildBuilderOptions } from './build';
import { relative, resolve } from 'path';

export = (
    initialConfig: Configuration,
    options: {
        options: ExtendedBuildBuilderOptions;
        configuration: string;
    }
) => {
    const config = webpackMerge(initialConfig, getCustomWebpack());
    let src = config.entry;
    if (Array.isArray(src)) {
        src = src[0];
    } else if (typeof src === 'object') {
        src = src.main[0];
    }
    if (typeof src !== 'string') {
        throw new Error(
            `Expected config.entry to be a string, got ${typeof config.entry}`
        );
    }
    const name = relative(options.options.sourceRoot || __dirname, src).replace(
        '.ts',
        ''
    );
    const srcMapInstall = resolve(__dirname, 'source-map-install.js');
    config.entry = { [name]: [srcMapInstall, src] };
    const webpackConfig = options.options.originalWebpackConfig;
    if (webpackConfig) {
        const configFn = require(webpackConfig);
        return configFn(config, options);
    }
    return config;
};

function getCustomWebpack(): Configuration {
    return {
        output: {
            libraryTarget: 'commonjs',
            // we create each chunk in it's own directory: this makes it easy to upload independent packages
            filename: '[name].js'
        },
        externals: [
            // use the aws-sdk provided on the lambda instead of uploading it
            /^aws-sdk/i
        ],
        optimization: {
            minimize: false
        }
    };
}
