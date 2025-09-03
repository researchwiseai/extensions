/* eslint-disable no-undef */

const devCerts = require('office-addin-dev-certs');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CustomFunctionsMetadataPlugin = require('custom-functions-metadata-plugin');
const path = require('path');

const urlDev = 'https://localhost:3000';
const urlProd = 'https://researchwiseai.github.io/extensions';
/* global require, module, process, __dirname */

async function getHttpsOptions() {
    const httpsOptions = await devCerts.getHttpsServerOptions();
    return {
        ca: httpsOptions.ca,
        key: httpsOptions.key,
        cert: httpsOptions.cert,
    };
}

module.exports = async (env, options) => {
    const dev = options.mode === 'development';
    const config = {
        devtool: 'source-map',
        entry: {
            polyfill: ['core-js/stable', 'regenerator-runtime/runtime'],
            shared: [
                './src/shared-runtime/shared-runtime.tsx',
                './src/shared-runtime/shared-runtime.html',
            ],
            modal: './src/modal/Modal.tsx',
            commands: './src/commands/commands.ts',
            functions: './src/functions/functions.ts',
            // Small script to populate summarize presets dynamically
            summarizeDialog: './src/taskpane/summarizeDialog.ts',
        },
        output: {
            // Clean output and set public path for assets
            clean: true,
            // In development serve from root; in production, prefix with /extensions/
            publicPath: dev ? '/' : '/extensions/',
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.html', '.js'],
            fallback: {
                crypto: false,
            },
        },
        module: {
            rules: [
                {
                    test: /\.[jt]sx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env',
                                [
                                    '@babel/preset-react',
                                    { runtime: 'automatic' },
                                ],
                                '@babel/preset-typescript',
                            ],
                        },
                    },
                },
                {
                    test: /\.css$/,
                    use: [
                        dev ? 'style-loader' : MiniCssExtractPlugin.loader,
                        'css-loader',
                        'postcss-loader',
                    ],
                },
                {
                    test: /\.html$/,
                    exclude: /node_modules/,
                    use: 'html-loader',
                },
                {
                    test: /\.(png|jpg|jpeg|gif|ico)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/[name][ext][query]',
                    },
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: dev ? '[name].css' : '[name].min.css',
            }),
            new HtmlWebpackPlugin({
                filename: 'shared-runtime.html',
                template: './src/shared-runtime/shared-runtime.html',
                chunks: ['polyfill', 'shared', 'functions'],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'assets/icons/*',
                        to: 'assets/icons/[name][ext][query]',
                    },
                    {
                        from: 'assets/*',
                        to: 'assets/[name][ext][query]',
                    },
                    {
                        from: 'manifest*.xml',
                        to: '[name]' + '[ext]',
                        transform(content) {
                            if (dev) {
                                return content;
                            } else {
                                return content
                                    .toString()
                                    .replace(
                                        '<AppDomain>https://localhost:3000</AppDomain>',
                                        '<AppDomain>https://researchwiseai.github.io</AppDomain>',
                                    )
                                    .replace(
                                        new RegExp(
                                            urlDev + '(?:public/)?',
                                            'g',
                                        ),
                                        urlProd,
                                    )
                                    // Ensure Ribbon tab shows as "Pulse" in production builds
                                    .replace(
                                        /DefaultValue=\"Pulse local\"/g,
                                        'DefaultValue="Pulse"',
                                    );
                            }
                        },
                    },
                    // Include OAuth2 PKCE redirect callback
                    {
                        from: 'src/taskpane/auth-callback.html',
                        to: 'auth-callback.html',
                    },
                ],
            }),
            new CustomFunctionsMetadataPlugin({
                input: './src/functions/functions.ts',
                output: 'functions.json',
            }),
            // Dialog page for range confirmation
            new HtmlWebpackPlugin({
                filename: 'SelectRangeDialog.html',
                template: './src/taskpane/SelectRangeDialog.html',
                inject: false,
            }),
            // Dialog for summarize options
            new HtmlWebpackPlugin({
                filename: 'SummarizeOptionsDialog.html',
                template: './src/taskpane/SummarizeOptionsDialog.html',
                inject: true,
                chunks: ['summarizeDialog'],
            }),
            // Dialog to display summary result
            new HtmlWebpackPlugin({
                filename: 'SummarizeResultDialog.html',
                template: './src/taskpane/SummarizeResultDialog.html',
                inject: false,
            }),
            // Dialog for extractions options (category + expansion)
            new HtmlWebpackPlugin({
                filename: 'ExtractionOptionsDialog.html',
                template: './src/taskpane/ExtractionOptionsDialog.html',
                inject: false,
            }),
            // Dialog page for choosing allocation mode
            new HtmlWebpackPlugin({
                filename: 'AllocationModeDialog.html',
                template: './src/taskpane/AllocationModeDialog.html',
                inject: false,
            }),
            // Dialog explaining how to connect
            new HtmlWebpackPlugin({
                filename: 'ConnectHelpDialog.html',
                template: './src/taskpane/ConnectHelpDialog.html',
                inject: false,
            }),
            // Dialog for sign-in (guarded flows)
            new HtmlWebpackPlugin({
                filename: 'AuthDialog.html',
                template: './src/taskpane/AuthDialog.html',
                inject: false,
            }),
            // Dialog for modals
            new HtmlWebpackPlugin({
                filename: 'Modal.html',
                template: './src/modal/Modal.html',
                chunks: ['polyfill', 'modal'],
            }),
        ],
        devServer: {
            static: {
                // Serve all files from dist at the root path
                directory: path.join(__dirname, 'dist'),
                publicPath: '/',
            },
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            server: {
                type: 'https',
                options:
                    env.WEBPACK_BUILD || options.https !== undefined
                        ? options.https
                        : await getHttpsOptions(),
            },
            port: process.env.npm_package_config_dev_server_port || 3000,
        },
    };

    return config;
};
