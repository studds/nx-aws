# Changelog

This file was generated using [@jscutlery/semver](https://github.com/jscutlery/semver).

# [0.15.0](https://github.com/studds/nx-aws/compare/v0.14.1...v0.15.0) (2022-11-08)


### Bug Fixes

* restore generate after v14 upgrade ([06d99a9](https://github.com/studds/nx-aws/commit/06d99a9b36b0201b80ddf75e8742357b963779ef))
* restore installNpmModules ([95f2b10](https://github.com/studds/nx-aws/commit/95f2b10b412f09ba7a2667f2ffb02a92b7aef70e))


### Features

* adding experimental layer executor ([d44b39c](https://github.com/studds/nx-aws/commit/d44b39cd79da9d3341fc3fe93f0ecbe56452f28e))
* **sam:** webpack build: remove non-external deps from generated package.json ([5e8f653](https://github.com/studds/nx-aws/commit/5e8f65362db099f7be77170af26fe9fcb822684a))



## [0.14.1](https://github.com/studds/nx-aws/compare/v0.14.0...v0.14.1) (2022-11-02)


### Bug Fixes

* resolve webpack config path ([f940a78](https://github.com/studds/nx-aws/commit/f940a78cee2d9c50ad1bf1f4e4dd6a0a8052fb03))



# [0.14.0](https://github.com/studds/nx-aws/compare/v0.13.0...v0.14.0) (2022-10-31)



# [0.13.0](https://github.com/studds/nx-aws/compare/v0.12.2...v0.13.0) (2021-08-22)

### Features

-   update to nx 12.1.1 ([074eb6a](https://github.com/studds/nx-aws/commit/074eb6a3c0b8e232c34f1355047a8e800124a331))
-   updating to nx 12.7 ([d165230](https://github.com/studds/nx-aws/commit/d165230b2538c422c4834fe686fb49f9f98929d6))

## [0.12.2](https://github.com/studds/nx-aws/compare/v0.12.1...v0.12.2) (2021-04-24)

### Bug Fixes

-   importStackOutputs must derive stackname from target config ([56b4fb1](https://github.com/studds/nx-aws/commit/56b4fb1e4115779ae9ba6756c9550d7ff4f57d32))

## [0.12.1](https://github.com/studds/nx-aws/compare/v0.12.0...v0.12.1) (2021-04-07)

### Bug Fixes

-   **sam:** Use a single build with multiple entries by default [#69](https://github.com/studds/nx-aws/issues/69) ([c39b777](https://github.com/studds/nx-aws/commit/c39b7775e04868a42318c74b5980e9e1bd5e59d4))

# [0.12.0](https://github.com/studds/nx-aws/compare/v0.11.1...v0.12.0) (2021-03-17)

### Bug Fixes

-   **sam:** fix [#66](https://github.com/studds/nx-aws/issues/66) generated WebBucketPolicy ([4775f04](https://github.com/studds/nx-aws/commit/4775f04ddc372cd3cb46d4043d511a7cbc46f458))
-   **sam:** fix [#67](https://github.com/studds/nx-aws/issues/67) s3 origin regional domain names ([a9f2646](https://github.com/studds/nx-aws/commit/a9f26469693f1a02e0974af15be8053c7da89509))
-   **sam:** handle spaces in parameter overrides closes [#63](https://github.com/studds/nx-aws/issues/63) ([45a5d35](https://github.com/studds/nx-aws/commit/45a5d3556755e0b61e9639a0744260f3b2f8a486))

### Features

-   **s3:** add buildOutputPath and buildTarget options to s3 deploy closes [#70](https://github.com/studds/nx-aws/issues/70) ([453b4a4](https://github.com/studds/nx-aws/commit/453b4a497be037618708dc51d533f00837be3fd4))

## [0.11.1](https://github.com/studds/nx-aws/compare/v0.11.0...v0.11.1) (2021-03-03)

### Bug Fixes

-   **sam:** correct required properties in build schema ([8aa684a](https://github.com/studds/nx-aws/commit/8aa684a5e154d5eb5198bfa79f8c90e165845e52))

# [0.11.0](https://github.com/studds/nx-aws/compare/v0.10.0...v0.11.0) (2021-03-01)

### Features

-   **sam/build:** install npm modules if generatePackageJson is on ([a93e230](https://github.com/studds/nx-aws/commit/a93e23066e7c1fae58ad840565cf727b58ee8647))
-   copy & paste the latest @nrwl/node:build ([773e5ce](https://github.com/studds/nx-aws/commit/773e5ce1085c25d64b6fb62b8ad2a40dc40a59a9))

# [0.10.0](https://github.com/studds/nx-aws/compare/v0.9.1...v0.10.0) (2021-02-24)

### Bug Fixes

-   get out of the way of how sam-cli handles layers [#55](https://github.com/studds/nx-aws/issues/55) ([6632316](https://github.com/studds/nx-aws/commit/6632316ad0283b5aeffa80912b083e0d3b66ef24))

### Features

-   **sam:** add support for parameter overrides to execute ([7d9bfbf](https://github.com/studds/nx-aws/commit/7d9bfbf7441b48b26441589e7038e25fb71c7274))

## [0.9.1](https://github.com/studds/nx-aws/compare/v0.9.0...v0.9.1) (2021-02-24)

### Bug Fixes

-   reverting to simple handler ([48d3625](https://github.com/studds/nx-aws/commit/48d36251988053fe9982f0fad08d3883ffcf80f8))
-   updating node builder for latest nx ([defdcbc](https://github.com/studds/nx-aws/commit/defdcbcb3b02b4f4a9995de2094f8dfae0b9ed45))

# [0.9.0](https://github.com/studds/nx-aws/compare/v0.8.3...v0.9.0) (2021-02-14)

### Features

-   enabling tree shaking ([f9a7b60](https://github.com/studds/nx-aws/commit/f9a7b605e78425f1a1c7b9dbc017fbfdc56fd6d2))
