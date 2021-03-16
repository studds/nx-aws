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

## deploy

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

## contributing

PRs and contributions are very very welcome!

### Building & testing locally

To build, run `yarn build`.

`yarn link` doesn't work to test locally, due to the way npm resolves dependencies. The best
workflow I've found is to copy across the files as the change. There's a script to do
this: `yarn pack:copy --projectPath ../test-nx-aws/` - just change `../test-nx-aws` to your
local test project.
