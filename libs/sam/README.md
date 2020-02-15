# @nx-aws/sam

[Angular CLI](https://cli.angular.io) Builders for [AWS SAM](https://aws.amazon.com/serverless/sam/) projects,
designed for use alongside [nx](https://nx.dev)

## Why

nx superpowers the angular CLI, to add support for a range of backend project types.

However, what if your backend uses SAM?

This project includes builders for that!

-   @nx-aws/sam:build - builds your functions and layers
-   @nx-aws/sam:package - packages your SAM (ie. CloudFormation) template ready for deployment
    (including resolving AWS::Serverless::Application references to other apps in your monorepo)
-   @nx-aws/sam:deploy - deploys your CloudFormation template

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
and find any `AWS::Serverless::Function` and `AWS::Serverless:LayerVersion` and trigger
appropriate builds.

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

If you've got this in your `template.yaml`:

```yaml
Resources:
    MyLayer:
        Type: 'AWS::Serverless::LayerVersion'
        Properties:
            ContentUri: ./src/my-layer
            CompatibleRuntimes:
                - nodejs10.x
                - nodejs8.10
            LicenseInfo: UNLICENCED
```

Lambda layers are deployed as node modules, and so we need to include a `./src/my-layer/package.json`

```json
{
    "name": "my-layer",
    "main": "index.ts"
}
```

The builder will:

1. Alter the output directory to include `nodejs/node_modules`, as required for a Lambda layer
1. Look for a package.json at `./src/my-layer/package.json`
1. Load `package.json` and get the `main` entry point (`index.ts`)
1. Run a webpack build for the `main` entry point
1. Re-write the `main` entry point in `package.json` and write it out to the output directory

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
                    "s3ArtefactsBucket": "my-artefacts-bucket"
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
                    "s3ArtefactsBucket": "my-artefacts-bucket"
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
