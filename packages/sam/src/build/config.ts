import { Configuration } from 'webpack';
import webpackMerge from 'webpack-merge';
import { ExtendedBuildBuilderOptions } from './build';
import { getEntriesFromCloudformation } from './get-entries-from-cloudformation';

export = (
    initialConfig: Configuration,
    options: {
        options: ExtendedBuildBuilderOptions;
        configuration: string;
    }
) => {
    const config = webpackMerge(initialConfig, getCustomWebpack());
    config.entry = getEntriesFromCloudformation(options.options);
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
