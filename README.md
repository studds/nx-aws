# @nx-aws/sam

[Angular CLI](https://cli.angular.io) Builders for [AWS SAM](https://aws.amazon.com/serverless/sam/) projects,
designed for use alongside [nx](https://nx.dev)

## Why

nx superpowers the angular CLI, to add support for a range of backend project types.

However, what if your backend uses SAM?

This project includes builders for that!

-   @nx-aws/sam:build - builds your functions
-   @nx-aws/sam:package - packages your SAM (ie. CloudFormation) template ready for deployment
    (including resolving AWS::Serverless::Application references to other apps in your monorepo)
-   @nx-aws/sam:deploy - deploys your CloudFormation template

## Get started

**NB: nx-aws 0.10.0 and higher require @nrwl/nx v11 and @angular-devkit/core v11.**

1. Open your existing workspace or run `npx create-nx-workspace` to create a new workspace
1. `npm install @nx-aws/sam` or `yarn add @nx-aws/sam`
1. `nx g @nx-aws/sam:app api [--frontendProject sample]`
1. Create a bucket in AWS to store deploy artifacts (via the [console](https://console.aws.amazon.com) or [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html) using `aws s3api create-bucket --bucket ${my-nx-deploy-artifacts} --region us-east-1`)
1. Update your `workspace.json` or `angular.json` to include the key `s3Bucket` under both the `package` and `deploy` targets (see details below).

## @nx-aws/sam:build

Add the following to your `angular.json`

```json
{
    "api": {
        "root": "apps/api",
        "sourceRoot": "apps/api/src",
        "projectType": "application",
        "prefix": "api",
        "schematics": {},
        "architect": {
            "build": {
                "builder": "@nx-aws/sam:build",
                "options": {
                    "outputPath": "dist/apps/api",
                    "template": "apps/api/template.yaml",
                    "tsConfig": "apps/api/tsconfig.app.json"
                },
            ...
            }
        }
    }
}
```

The builder will search through your CloudFormation template at `apps/api/template.yaml`
and find any `AWS::Serverless::Function` and trigger appropriate builds.

(All the other options are the same as for nrwl's node builder.)

### Functions

Given this code in your `template.yaml`:

```yaml
Resources:
    MyFunction:
        Type: 'AWS::Serverless::Function'
        Properties:
            # CodeUri should be the directory, relative to template.yaml, where the handler file is found
            CodeUri: src/my-function
            # This is the name of the handler file and then the name of the exported handler function
            # (standard SAM approach)
            Handler: handler-file.handlerFn
```

The builder will run a webpack build for `src/my-function/handler-file`.

### Lambda Layers

#### Building lambda layers - experimental

There's an experimental builder added for lambda layers, `@nx-aws/sam:layer`. It wraps the [tsc executor](https://nx.dev/packages/js/executors/tsc#@nrwl/js:tsc),
with all the same options.

After the tsc executor has run, it creates a package.json file, runs `npm install` with appropriate flags for AWS Lambda, and then zips the result. You can then deploy this
using the `package` and `deploy` executors.

This is the resource you'll need in your `template.yaml`:

```yaml
AirmailLayer:
    Type: AWS::Serverless::LayerVersion
    Description: Airmail layer
    Properties:
        ContentUri: ./nodejs.zip
        CompatibleRuntimes:
            - nodejs14.x
            - nodejs16.x
```

**Note:** At the moment, the ContentUri ./nodejs.zip is essentially hard-coded. The assumption is, essentially, that the layer is the only resource in this template.

My preferred way to use the layer is via the `importStackOutputs` on another stack.

#### Using lambda layers in functions

Lambda layers defined in your template should Just Work - however, the way sam-cli treats layers is broken,
so they won't: https://github.com/aws/aws-sam-cli/issues/2222.

That said, if you've got a layer defined like this:

```
  TestLayer:
    Type: AWS::Serverless::LayerVersion
    Description: Test layer
    Properties:
      ContentUri: ./src/test-layer
      CompatibleRuntimes:
        - nodejs10.x
        - nodejs12.x
    Metadata:
      BuildMethod: nodejs12.x
```

Then during `serve` or `build` nx-aws will simply map the `ContentUri` to an absolute path. Assuming you've got a
layer at that location that `sam-cli` is happy with, then you're good to go.

## @nx-aws/sam:package

Add the following to your `angular.json`:

```json
{
    "api": {
        "root": "apps/api",
        "sourceRoot": "apps/api/src",
        "projectType": "application",
        "prefix": "api",
        "schematics": {},
        "architect": {
            "package": {
                "builder": "@nx-aws/sam:package",
                "options": {
                    "templateFile": "apps/api/template.yaml",
                    "outputTemplateFile": "dist/apps/api/serverless-output.yaml",
                    "s3Prefix": "api",
                    "s3Bucket": "my-artefacts-bucket"
                },
                "configurations": {
                    "production": {}
                }
            }
        }
    }
}
```

**NB: sam:package requires an S3 bucket to store deploy artefacts - you need to create a bucket and add the `s3Bucket` option to your project configuration**

For the most part, this simply wraps the `aws cloudformation package` command, but it will also
rewrite the `Location` property of `AWS::Serverless::Application` resources, if they refer to
another project.

### AWS::Serverless::Application

The package builder will attempt to resolve a reference to another CloudFormation stack, defined
in a _different_ project in `angular.json`.

If the package builder finds an `AWS::Serverless::Application` in `template.yaml`, eg:

```yaml
Resources:
    MySubStack:
        Type: AWS::Serverless::Application
        Properties:
            Location: my-sub-stack
```

it will attempt to:

1. Find an project in `angular.json` that matches the `Location` property, ie. `my-sub-stack`.
2. If it finds such a project, it will look for the `package` target.
3. If it finds the `package` target, it will replace `my-sub-stack` with the absolute path to
   the `outputTemplateFile` from that target.

## @nx-aws/sam:deploy

Add the following to `angular.json`:

```json
{
    ...
    "api": {
        "root": "apps/api",
        "sourceRoot": "apps/api/src",
        "projectType": "application",
        "prefix": "api",
        "schematics": {},
        "architect": {
            ...
            "deploy": {
                "builder": "@nx-aws/sam:deploy",
                "options": {
                    "templateFile": "dist/apps/api/serverless-output.yaml",
                    "s3Prefix": "api",
                    "capabilities": ["CAPABILITY_IAM", "CAPABILITY_AUTO_EXPAND"],
                    "s3Bucket": "my-artefacts-bucket",
                    "stackNameFormat": "api-$ENVIRONMENT"
                },
                "configurations": {
                    "production": {}
                }
            }
        }
    }
}
```

**NB: sam:deploy requires an S3 bucket to store deploy artefacts - you need to create a bucket and add the `s3Bucket` option to your project configuration - this must be the same as used for sam:package**

This wraps the `aws cloudformation deploy` command. The one nice thing it does is pull
any parameters defined in your `template.yaml` from environment variables, and pass them
in as parameter overrides. For example, if you have in your `template.yaml`:

```yaml
Parameters:
    MyParameter:
        Type: String
        Description: An example parameter
```

The the deploy builder will look for an environment variable MY_PARAMETER and pass it in as
a parameter overrides.

## @nx-aws/s3:deploy

s3:deploy will deploy compiled files to an s3 bucket and trigger a cache invalidation on a CloudFront distribution.

It is designed to work in concert with a backend project which deploys an s3 bucket and CloudFront distribution (see above). Notably, the "bucket" and "distribution" values will be retrieved from Cloudformation stack outputs from a sam:deploy target.

It uses the `s3 sync` command of the [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html) to upload the files.

Add the following to `angular.json`:

```json
{
    ...
    "app": {
        "root": "apps/app",
        "sourceRoot": "apps/app/src",
        "projectType": "application",
        "schematics": {},
        "architect": {
            ...
           "deploy": {
                "builder": "@nx-aws/s3:deploy",
                "options": {
                    "destPrefix": "public",
                    "bucket": {
                        "targetName": "api:deploy",
                        "outputName": "WebBucket"
                    },
                    "distribution": {
                        "targetName": "api:deploy",
                        "outputName": "DistributionId"
                    },
                    "config": {
                        "configFileName": "config.json",
                        "importStackOutputs": {}
                    }
                },
                "configurations": {
                    "production": {
                        "stackSuffix": "prod"
                    }
                }
            }
        }
    }
}
```

### Options

-   **bucket** - (Required) An object with `targetName` (referring to a sam:deploy project) and `outputName` (referring to a CloudFormation stack output with the bucket name)
-   **distribution** - (Required) An object with `targetName` (referring to a sam:deploy project) and `outputName` (referring to a CloudFormation stack output with the distribution id)
-   **destPrefix** - (Optional) The key prefix used to upload the files to s3. Note that the distribution must be configured with a matching `OriginPath`
-   **buildTarget** - Target to retrieve outputPath from - by default, will use the build target on the current project
-   **buildOutputPath** - (Optional) - Explicit path to the built output that will be uploaded to S3 - defaults to outputPath from the build target on the current project
-   **resources** - (Optional) - An array of objects as described below, which determines which files are sync'd, and the cache control and invalidation settings.
-   **config** - (Required due to a bug, but can be empty as above): allows deploying a config file with any environment-specific values. This allows a build-once deploy-many workflow, if desired, as opposed to building once for each environment. Outputs from other stacks can be imported using `importStackOutputs`.
-   **configValues** - (Optional) Map of config values - separate from config to allow easy overrides

### Resources

By default, the following resources are uploaded:

```ts
[
    {
        include: dynamicResources,
        cacheControl: 'no-cache, stale-while-revalidate=300',
        invalidate: true,
    },
    {
        include: ['*.js', '*.css', '*.woff'],
        cacheControl: 'public, max-age=315360000, immutable',
        invalidate: false,
    },
    {
        include: [],
        cacheControl: 'public, max-age=86400, stale-while-revalidate=315360000',
        invalidate: false,
    },
];
```

These defaults can be overrides by provided an array of objects with the following properties:

-   **include** - (Required): an array of file names or file patterns, passed to the s3 sync command.
-   **cacheControl** - (Required): the cache control header, passed to the s3 sycn command.
-   **invalidate** - (Required): whether or not these files should be invalidated in CloudFront.

## faq

### How do I resolve the error "Required property 's3Bucket' is missing"?

The SAM package and deploy steps require an s3 bucket to store and retrieve deployment artefacts.

You need to create and s3 bucket to store your deployment artefacts and then include that bucket in your project configuration.

1. Create a bucket in AWS to store deploy artifacts (via the [console](https://console.aws.amazon.com) or [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html) using `aws s3api create-bucket --bucket ${my-nx-deploy-artifacts} --region us-east-1`)
1. Update your `workspace.json` or `angular.json` to include the key `s3Bucket` under both the `package` and `deploy` targets (see details above for the package and deploy steps).

## contributing

PRs and contributions are very very welcome!

### Building & testing locally

To build, run `yarn build`.

`yarn link` doesn't work to test locally, due to the way npm resolves dependencies. The best
workflow I've found is to copy across the files as the change. There's a script to do
this: `yarn pack:copy --projectPath ../test-nx-aws/` - just change `../test-nx-aws` to your
local test project.
