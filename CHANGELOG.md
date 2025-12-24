# Changelog

## [1.17.1](https://github.com/TerrorSquad/php-booster/compare/v1.17.0...v1.17.1) (2025-12-24)


### Bug Fixes

* enhance symlink setup to handle non-empty directories safely ([bc2b9fc](https://github.com/TerrorSquad/php-booster/commit/bc2b9fcb5e207b28ef0c22f183e8d99afe4bdc3c))

## [1.17.0](https://github.com/TerrorSquad/php-booster/compare/v1.16.0...v1.17.0) (2025-12-22)


### Features

* add PHP auto-fix workflow and enhance Psalm symlink handling ([a823247](https://github.com/TerrorSquad/php-booster/commit/a823247b5fc5319a9c76ef62226bc1c648751fad))


### Bug Fixes

* address PR review comments ([a49ccf6](https://github.com/TerrorSquad/php-booster/commit/a49ccf60e8d2d26feb086559c8cb10263c00ca40))

## [1.16.0](https://github.com/TerrorSquad/php-booster/compare/v1.15.0...v1.16.0) (2025-12-21)


### Features

* add DDEV_PHP environment variable to control PHP tool execution on host ([d848500](https://github.com/TerrorSquad/php-booster/commit/d848500f28f63d2bacab4d3a0eacba45ab41bd07))
* add verbose flag to enhance output control in integration tests and related utilities ([0e15d38](https://github.com/TerrorSquad/php-booster/commit/0e15d38e964bf6a422bee9656a92ef7bdc9bd6f4))
* integrate mise for dependency management in tests and scripts ([e4fcbd4](https://github.com/TerrorSquad/php-booster/commit/e4fcbd4b595acc01e9230a73663e1f8bb1cd3343))


### Bug Fixes

* implement ensureMutagenSync and commit integration changes in hook testing ([4855607](https://github.com/TerrorSquad/php-booster/commit/485560754fc928130b288ad4d7220021f8ad9d3d))
* read node version from mise.toml in update workflow ([5a71ce4](https://github.com/TerrorSquad/php-booster/commit/5a71ce491102ccc6ea13ca1cffca13bcf414a7c4))
* update booster dependencies workflow to use mise.toml ([90f0d3d](https://github.com/TerrorSquad/php-booster/commit/90f0d3d91e9e87aeabf092ec8935df185336150b))
* update dependency checks for pnpm and remove unnecessary ddev config updates ([3a45fe4](https://github.com/TerrorSquad/php-booster/commit/3a45fe416310a2bae93716f68c6ee90e60632bd9))
* update git hooks to use pnpm for dependency management and add pnpm-lock.yaml handling ([752e95b](https://github.com/TerrorSquad/php-booster/commit/752e95bae029fc03cecc0d63adeba90375b9db97))
* use --no-frozen-lockfile for pnpm install in tests ([2ab6d22](https://github.com/TerrorSquad/php-booster/commit/2ab6d22e01c6607a4c560b3db8bf6843157c1c55))

## [1.15.0](https://github.com/TerrorSquad/php-booster/compare/v1.14.0...v1.15.0) (2025-12-16)


### Features

* **integrate-booster:** add Deptrac initialization function to enhance code quality checks ([78ef532](https://github.com/TerrorSquad/php-booster/commit/78ef532c1bd89834734b71fa1ea8ca0b322d3ce3))


### Bug Fixes

* **eslint-config:** correct json config placement in ESLint configuration ([1741d41](https://github.com/TerrorSquad/php-booster/commit/1741d41c9e9bc47b09cb5d34324995daa3dd3fb2))

## [1.14.0](https://github.com/TerrorSquad/php-booster/compare/v1.13.2...v1.14.0) (2025-12-16)


### Features

* **psalm:** add Psalm integration scripts and update VS Code settings ([bda2ac4](https://github.com/TerrorSquad/php-booster/commit/bda2ac43b4266214aaf2b489a4a61bd21226777b))


### Bug Fixes

* **tests:** add wait for Mutagen sync before setting environment for faster testing ([7bbf77c](https://github.com/TerrorSquad/php-booster/commit/7bbf77c7f817a85e9041ec18249f6f2429efe4cd))

## [1.13.2](https://github.com/TerrorSquad/php-booster/compare/v1.13.1...v1.13.2) (2025-12-16)


### Bug Fixes

* **hooks:** improve error handling and logging in branch name validation ([be43b37](https://github.com/TerrorSquad/php-booster/commit/be43b37b6a5f433d017a077077005a02b47e77a3))
* **hooks:** use psalm.phar instead of psalm ([07109de](https://github.com/TerrorSquad/php-booster/commit/07109de5608dd03ffa7b16144dee82355ceae01a))
* **runner:** enhance Docker command execution with improved PATH handling ([25898b4](https://github.com/TerrorSquad/php-booster/commit/25898b4f5416219b153cc8ace4c8f63c7f5b62f7))
* **tools:** add Psalm tool configuration with separate entry for psalm.phar ([ec97cc0](https://github.com/TerrorSquad/php-booster/commit/ec97cc02e70b5298ee135dbccd600d78ed5966d3))

## [1.13.1](https://github.com/TerrorSquad/php-booster/compare/v1.13.0...v1.13.1) (2025-12-16)


### Bug Fixes

* **hooks:** update prepare script to link husky directory correctly ([45c8578](https://github.com/TerrorSquad/php-booster/commit/45c8578c14f79365abf23311063109527bdc0208))
* skip Deptrac checks in hook testing environment ([1ebb86d](https://github.com/TerrorSquad/php-booster/commit/1ebb86d3b79c9de3169f6c63e6364bfb773ec5bb))

## [1.13.0](https://github.com/TerrorSquad/php-booster/compare/v1.12.0...v1.13.0) (2025-12-16)


### Features

* refactor husky hooks and shared utilities ([78ed5cb](https://github.com/TerrorSquad/php-booster/commit/78ed5cb1d6e77abd1b0c07e13a6c07b10034c0af))


### Performance Improvements

* **hooks:** optimize git hooks ([7dee6b3](https://github.com/TerrorSquad/php-booster/commit/7dee6b3a83dd1bcd23b356af2dd85325ab581278))

## [1.12.0](https://github.com/TerrorSquad/php-booster/compare/v1.11.0...v1.12.0) (2025-12-11)


### Features

* **integrate_booster:** add fallback for jq command and include deptrac as a critical package ([ad595ec](https://github.com/TerrorSquad/php-booster/commit/ad595ec7b627784545818b478454249c357011e9))


### Bug Fixes

* **check_php_syntax:** implement concurrency limit for PHP syntax checks and update deptrac image generation formatter ([309060d](https://github.com/TerrorSquad/php-booster/commit/309060d481c02a67b471983af4097b0dcc8c2200))

## [1.11.0](https://github.com/TerrorSquad/php-booster/compare/v1.10.0...v1.11.0) (2025-12-10)


### Features

* **hooks:** refactor husky hooks to improve deptrac image generation and API documentation handling ([46f4346](https://github.com/TerrorSquad/php-booster/commit/46f43462ee52828b4bb6c6c34f1c8b3764b93970))


### Bug Fixes

* **deptrac:** enhance checks for Deptrac configuration in pre-commit and pre-push hooks ([dbb838e](https://github.com/TerrorSquad/php-booster/commit/dbb838e2d5a50fb3028771371fdeff9371fe47d7))

## [1.10.0](https://github.com/TerrorSquad/php-booster/compare/v1.9.3...v1.10.0) (2025-12-10)


### Features

* **git:** use host git user configuration in ddev web container ([25b4ff1](https://github.com/TerrorSquad/php-booster/commit/25b4ff165ea163eb92f5e6d421678df497b5c066))
* migrate git hooks to .husky directory ([ed9a70b](https://github.com/TerrorSquad/php-booster/commit/ed9a70bec16303e8db1c36ca3a693579775d5858))

## [1.9.3](https://github.com/TerrorSquad/php-booster/compare/v1.9.2...v1.9.3) (2025-11-11)


### Bug Fixes

* add max-lines input to limit processed file size and skip large files in PHP auto-fix action ([b9ba748](https://github.com/TerrorSquad/php-booster/commit/b9ba748db3c1129c6c6d84e905dc0ac0a8e3bf39))
* update branch name validation to include 'develop/test2' in skipped branches ([41d76a6](https://github.com/TerrorSquad/php-booster/commit/41d76a687067ef385746592225c8560342c7bc48))

## [1.9.2](https://github.com/TerrorSquad/php-booster/compare/v1.9.1...v1.9.2) (2025-11-11)


### Bug Fixes

* add PHP syntax checking before auto-fixing with Rector and ECS ([14bd133](https://github.com/TerrorSquad/php-booster/commit/14bd13354c640cd3de49dc14315311b0f6228a5a))

## [1.9.1](https://github.com/TerrorSquad/php-booster/compare/v1.9.0...v1.9.1) (2025-11-09)


### Bug Fixes

* remove duplicate commit message format section and update TOC ([97a521d](https://github.com/TerrorSquad/php-booster/commit/97a521d8463400803dfc1b9e9552f024d1ec5b7e))
* remove invalid documentation path reference ([a6ba5cc](https://github.com/TerrorSquad/php-booster/commit/a6ba5cc7808fc851bc005cb949bd17e95df9ef6e))

## [1.9.0](https://github.com/TerrorSquad/php-booster/compare/v1.8.0...v1.9.0) (2025-11-08)


### Features

* add --no-interaction flag to composer require commands for non-interactive installations ([df549d9](https://github.com/TerrorSquad/php-booster/commit/df549d97c0fb6e34cdcb4341514c775efa0c9e18))
* enhance TestOrchestrator with expected file verification and improved interactive mode testing ([1350b37](https://github.com/TerrorSquad/php-booster/commit/1350b37b39f6b2be878e94e398dabbc2ea4bfc32))


### Bug Fixes

* correct shebang line in pre-commit hook ([ab39afb](https://github.com/TerrorSquad/php-booster/commit/ab39afb7d142315952ca8f0f3df8dafc448aefb6))

## [1.8.0](https://github.com/TerrorSquad/php-booster/compare/v1.7.0...v1.8.0) (2025-11-07)


### Features

* enhance branch validation logging and output formatting in hook testing ([7d8dd97](https://github.com/TerrorSquad/php-booster/commit/7d8dd979417801260eca15efc430a540d43183a6))
* enhance branch validation tests with detailed logging and error handling ([b2cda46](https://github.com/TerrorSquad/php-booster/commit/b2cda4638e2c8731595f903be3323d237a42cba2))
* enhance logging and output formatting in integration scripts and tests ([97832eb](https://github.com/TerrorSquad/php-booster/commit/97832ebd932cad1bf255877bf3e23a1e07b20e5e))
* implement final integration commit for PHP Booster with validation checks ([548b729](https://github.com/TerrorSquad/php-booster/commit/548b729838c149cfaa0384f4a59bf6ae6ae4c32e))
* improve branch checkout logic and error handling in hook testing ([c4c86bc](https://github.com/TerrorSquad/php-booster/commit/c4c86bca4c080b61a69480111f8ce988f8cf7b23))
* improve logging output formatting for environment variable loading and logging utilities ([d814d63](https://github.com/TerrorSquad/php-booster/commit/d814d6336e79c4e8a27b08b034a03ce1db5fad90))
* refactor branch switching logic in hook testing utilities ([9f0457f](https://github.com/TerrorSquad/php-booster/commit/9f0457fbe3f1a33126bd65dfc3df4e14d7e4bc27))

## [1.7.0](https://github.com/TerrorSquad/php-booster/compare/v1.6.1...v1.7.0) (2025-10-20)


### Features

* add comprehensive tests for Renovate feature ([df1ac33](https://github.com/TerrorSquad/php-booster/commit/df1ac33dcdd354e92fa9f74a5652ae0c4c68c6da))
* add Renovate bot integration for automated dependency updates ([849dfcd](https://github.com/TerrorSquad/php-booster/commit/849dfcd083926c9f8a7bd399c0d282e660889086))
* implement Renovate bot integration for automated dependency updates ([23f3d4c](https://github.com/TerrorSquad/php-booster/commit/23f3d4c925f1a468e236feece045628a73039919))


### Bug Fixes

* address code review feedback for Renovate implementation ([36eab14](https://github.com/TerrorSquad/php-booster/commit/36eab14c6684b43b6d5e82d1a66436f5c1fdcc13))
* use correct Composer package patterns in renovate.json ([3d73c16](https://github.com/TerrorSquad/php-booster/commit/3d73c16c5f2a1e9bac38818858ae8d4bdda4b42b))

## [1.6.1](https://github.com/TerrorSquad/php-booster/compare/v1.6.0...v1.6.1) (2025-10-20)


### Bug Fixes

* consolidate interactive mode testing into main framework ([eae166e](https://github.com/TerrorSquad/php-booster/commit/eae166eb86bbd77a40e1a7119fe8301b2e335f12))

## [1.6.0](https://github.com/TerrorSquad/php-booster/compare/v1.5.0...v1.6.0) (2025-10-11)


### Features

* upgrade node to v24 ([ee6c2d5](https://github.com/TerrorSquad/php-booster/commit/ee6c2d5d90533f2652294c9126ff6d6252a71ef4))

## [1.5.0](https://github.com/TerrorSquad/php-booster/compare/v1.4.0...v1.5.0) (2025-10-05)


### Features

* enhance environment variable forwarding in DDEV container execution ([938ea2f](https://github.com/TerrorSquad/php-booster/commit/938ea2f1a6d6a03921aac0996a0092fcbac9cf57))
* update PHP version to 8.4.0 and upgrade pnpm to 10.18.0 in configuration files ([bb08756](https://github.com/TerrorSquad/php-booster/commit/bb0875696dbfc7149b8539144939e7e307b1f1ac))
* upgrade PHP version from 8.2 to 8.4 in DDEV configuration ([f24975f](https://github.com/TerrorSquad/php-booster/commit/f24975f992072ad1fc366fbda6e394748869e774))

## [1.4.0](https://github.com/TerrorSquad/php-booster/compare/v1.3.0...v1.4.0) (2025-10-05)


### Features

* add packageManager field to package.json merging process ([c4b8567](https://github.com/TerrorSquad/php-booster/commit/c4b8567e594d675ded9452e8df00716f7f0df177))
* add pnpm version retrieval and installation steps in PHP auto-fix action ([f89f36a](https://github.com/TerrorSquad/php-booster/commit/f89f36a6d7f9abca429173c9b47fd1d8d68d449f))


### Bug Fixes

* add paths to trigger release process for booster and tools directories ([76ba607](https://github.com/TerrorSquad/php-booster/commit/76ba607759499f5d5fb160507d86123e3b49339d))
* remove .vscode entries from project .gitignore as booster provides IDE settings ([5353f1c](https://github.com/TerrorSquad/php-booster/commit/5353f1c10ed9d0f2b768720665901300967966a0))
* standardize formatting in integration-tests.yml for consistency ([6c00c82](https://github.com/TerrorSquad/php-booster/commit/6c00c82b481cead64c9589fe33c86f9d25473e3e))
* update OpenAPI specification generation to use documentation/api.php ([25f65c5](https://github.com/TerrorSquad/php-booster/commit/25f65c554510bbf420711b2e33e46626e7b9c12d))

## [1.3.0](https://github.com/TerrorSquad/php-booster/compare/v1.2.0...v1.3.0) (2025-09-30)


### Features

* add comprehensive GitHub Actions auto-fix testing and documentation ([44fdc23](https://github.com/TerrorSquad/php-booster/commit/44fdc231afacab8d51bd747b3f207a42295b3b3f))
* add GitHub Actions for automatic PHP code fixing ([2d05ae1](https://github.com/TerrorSquad/php-booster/commit/2d05ae1e78fc04d310150cb447c5afd2ce4ac246))
* improve color support for WSL and CI environments ([d3d0664](https://github.com/TerrorSquad/php-booster/commit/d3d06649c04700b29aacc6a3ece4320663622dd2))
* parse .ddev/config.yaml directly for container name ([cfea3b7](https://github.com/TerrorSquad/php-booster/commit/cfea3b7529d3b74d0e9c67ea2f3beee620ab0c55))
* use docker exec -t for color support when possible ([cca3012](https://github.com/TerrorSquad/php-booster/commit/cca30120032e104dbc46352198a3a97a3a3c30b2))


### Bug Fixes

* correct ddev exec environment variable syntax ([ffb3bff](https://github.com/TerrorSquad/php-booster/commit/ffb3bff7db73bdcff21b7272bedc165a4559d352))
* preserve colors through ddev exec by passing environment variables ([f9e2fd0](https://github.com/TerrorSquad/php-booster/commit/f9e2fd09c1c93f99698efe3727fed58908fb9f6a))
* use bash -c for proper environment variable handling in ddev exec ([7789a96](https://github.com/TerrorSquad/php-booster/commit/7789a964a52b3925d5ed7cfbcec78e66c60a3cb1))


### Reverts

* simplify runner.sh and document color limitation ([29f8c5f](https://github.com/TerrorSquad/php-booster/commit/29f8c5f11f258df50348e11e55f89c071e21a8cb))

## [1.2.0](https://github.com/TerrorSquad/php-booster/compare/v1.1.0...v1.2.0) (2025-09-30)


### Features

* add performance monitoring to git hooks with execution timing and insights ([1393ec9](https://github.com/TerrorSquad/php-booster/commit/1393ec93ef7ab2a592e3ecd5811d6f31e84da3e8))
* enhance git hooks with tool-specific skip controls and improved logging ([1dd6d94](https://github.com/TerrorSquad/php-booster/commit/1dd6d94c012f6294323c17bfcf0b108d2bde5945))
* implement runner.sh for git hooks CI compatibility ([d4b21d0](https://github.com/TerrorSquad/php-booster/commit/d4b21d0844309144014b693a8cc98fce0a89487b))


### Bug Fixes

* clean up DDEV version output formatting ([762dd00](https://github.com/TerrorSquad/php-booster/commit/762dd00a18de0cf69db3349de6e96fcd7b5ff12f))
* enhance DDEV container detection and improve error logging in CI environments ([3c80349](https://github.com/TerrorSquad/php-booster/commit/3c803499b5ca5d315f2c86310b91f36df95676e8))
* **integration:** install composer dependencies individually to prevent silent failures ([88df24a](https://github.com/TerrorSquad/php-booster/commit/88df24a1da3fda8b3b44ca88ed0c9768018b270c))
* remove composer requirement from host environment check ([82e5cff](https://github.com/TerrorSquad/php-booster/commit/82e5cfff84a87e81738425da3152ca13a6abb57b))
* remove duplicate ticket footer appending in commit-msg hook ([e139731](https://github.com/TerrorSquad/php-booster/commit/e13973107d7258d63bcfafa86112a1d8395e0e25))
* remove verbose PATH output from environment check ([b4cb532](https://github.com/TerrorSquad/php-booster/commit/b4cb532c0890c47be3f169c5ca55c68315f64e41))
* update environment variables in tests and documentation for new TypeScript implementation ([0e4b804](https://github.com/TerrorSquad/php-booster/commit/0e4b8043f97223538fbbe913e55f408a87ff24df))
* update PHPTool definition for compatibility with Node.js TypeScript strip-only mode ([41f3d95](https://github.com/TerrorSquad/php-booster/commit/41f3d958fbc96b23e091ddfc997b81b1c1cc8452))
* use DDEV for project creation instead of host composer ([9af7df3](https://github.com/TerrorSquad/php-booster/commit/9af7df3f697462691a73df46052d9edb0323bd8b))

## [1.1.0](https://github.com/TerrorSquad/php-booster/compare/v1.0.0...v1.1.0) (2025-09-24)


### Features

* enhance commit and pre-commit hooks with environment variable support and improved logging ([00ab3cb](https://github.com/TerrorSquad/php-booster/commit/00ab3cb3071958dbf38b129a644d1f112bafe91d))

## [1.0.0](https://github.com/TerrorSquad/php-booster/compare/v0.6.0...v1.0.0) (2025-09-16)


### ⚠ BREAKING CHANGES

* migrate git hooks to ZX

### Features

* migrate git hooks to ZX ([2bd5a28](https://github.com/TerrorSquad/php-booster/commit/2bd5a28b2471f4db614331244fc170e46bb00d1a))

## [0.6.0](https://github.com/TerrorSquad/php-booster/compare/v0.5.0...v0.6.0) (2025-08-13)


### Features

* add version management and integration checks for PHP Booster ([c5bff71](https://github.com/TerrorSquad/php-booster/commit/c5bff71c6b49bef5b2acd170e507ed70a6e97307))

## [0.5.0](https://github.com/TerrorSquad/php-booster/compare/v0.4.0...v0.5.0) (2025-08-13)


### Features

* add .editorconfig for consistent coding styles across files ([af519ea](https://github.com/TerrorSquad/php-booster/commit/af519ea696e6d06c89b4d639b152e568f0429356))
* add .phpstorm directory copy and prevent duplicate README_SNIPPET.md appending ([2bd1c4f](https://github.com/TerrorSquad/php-booster/commit/2bd1c4fb70d675f1c62e251f42c084abd43e2798))
* add checks for Volta and PNPM installation in integrate_booster.sh ([407e477](https://github.com/TerrorSquad/php-booster/commit/407e477287d01f834455f4417fe5ead01a34cec2))
* add documentation ([fd6f9e4](https://github.com/TerrorSquad/php-booster/commit/fd6f9e481ec91a0a16c2e588cd8514d5438614b3))
* add docus documentation ([929d8ab](https://github.com/TerrorSquad/php-booster/commit/929d8ab47dda100a844e09254c0c2bd88ada9960))
* add function to update nginx configuration with XDEBUG_TRIGGER ([e3c1187](https://github.com/TerrorSquad/php-booster/commit/e3c1187cdf7d5bf91d10a5996f4b02309b21a449))
* add functions to retrieve DDEV container name and update server elements for HTTP and HTTPS ([a160808](https://github.com/TerrorSquad/php-booster/commit/a160808ec9f8180c1cb8f3fdf7dbbb002ea2c6a3))
* add git wrapper hooks that run bash ([f77076b](https://github.com/TerrorSquad/php-booster/commit/f77076bfc7a2276fb5f6ea6dbc05420331f8ebd8))
* add GitHub Actions integration testing ([4a2cbd9](https://github.com/TerrorSquad/php-booster/commit/4a2cbd90f5a24ce3f049eaa275ebf93b9d8eb8df))
* add integrate_booster.sh script ([e6b38df](https://github.com/TerrorSquad/php-booster/commit/e6b38df33bfd60d9357f30f4cba7b345f95ecedd))
* add LICENSE.md and README.md files ([40c2ebc](https://github.com/TerrorSquad/php-booster/commit/40c2ebc28b156a4b877347bf94518fff7577c28a))
* add post-start script to update Nginx configuration for XDEBUG_TRIGGER ([037ccc9](https://github.com/TerrorSquad/php-booster/commit/037ccc954bcd338376f61b04ca49943c30094617))
* add release-please workflow and configuration files for automated releases ([7bada92](https://github.com/TerrorSquad/php-booster/commit/7bada924c66813b75700cecd204e70131682ed7d))
* add Tools directory with icon ([c6962ff](https://github.com/TerrorSquad/php-booster/commit/c6962ff5d904645014571523eed414db5c719b5c))
* Add ZscalerRootCA.crt certificate file ([7f562be](https://github.com/TerrorSquad/php-booster/commit/7f562bef928c62017d1ce0abb1dfa2be907ba180))
* **branch:** add branch name validation with config and tests ([01ed65c](https://github.com/TerrorSquad/php-booster/commit/01ed65ce5fbf18bf748bdad68c4d901f486342ae))
* **commit:** add unified commit-utils helper and tests ([f686737](https://github.com/TerrorSquad/php-booster/commit/f6867370dd5397a2b34fef4540093e7e577e0d37))
* dynamically add php dirs to tools config files ([2c81d7b](https://github.com/TerrorSquad/php-booster/commit/2c81d7bc5c60dbcec51cf9d7c57a2c3e99b4d466))
* enhance DDEV configuration and add Xdebug setup scripts ([1a36459](https://github.com/TerrorSquad/php-booster/commit/1a36459ec3696f76b305fb4a08bfb70eda91183c))
* enhance dependency management in add_code_quality_tools function ([4a802c6](https://github.com/TerrorSquad/php-booster/commit/4a802c6455e1895aa7b29b668e07a1d1059a402a))
* enhance git hooks with Deptrac integration ([e4d8a1e](https://github.com/TerrorSquad/php-booster/commit/e4d8a1e8ff4156e359d01a4788a680316847170b))
* enhance integration scripts and README for Symfony and Laravel projects ([83392f6](https://github.com/TerrorSquad/php-booster/commit/83392f69802033da7adccb6a0502aa678e67033f))
* import subprocess module in pre-start.py for enhanced functionality ([5e87340](https://github.com/TerrorSquad/php-booster/commit/5e87340697d0ff764f3e214b17874db324dcfdc1))
* refactor git hooks with common library for improved logging and organization ([1ddc5bc](https://github.com/TerrorSquad/php-booster/commit/1ddc5bc9fcb2dca92c758b075745a0f01ac29f91))
* update DDEV configuration to set Node.js version and enable Corepack ([5662876](https://github.com/TerrorSquad/php-booster/commit/5662876c34e375e2b46a6be9d5db1c79a509370b))
* update git hooks ([1ca1027](https://github.com/TerrorSquad/php-booster/commit/1ca10276093a7802bc8cb0c2310f690fe7689cf1))
* update git hooks and some config files ([99469db](https://github.com/TerrorSquad/php-booster/commit/99469db04192251d5ec2ae1a83e85c1d7a466015))
* update PHP version in SonarQube workflow to 8.3 ([6faf7a8](https://github.com/TerrorSquad/php-booster/commit/6faf7a888638196c5801d611edf472fd3b664f93))
* update readme only for ddev projects ([25262d4](https://github.com/TerrorSquad/php-booster/commit/25262d4fec93c67fafa0ad75644ffbe3ffa89496))
* update testing scripts to include Pest and PhpUnit coverage options ([6f68dc4](https://github.com/TerrorSquad/php-booster/commit/6f68dc4dabddfb4e8a1091ffe66b163aac609c7c))
* use pnpm@10 ([9ef1bd5](https://github.com/TerrorSquad/php-booster/commit/9ef1bd55cb96168f4bb3236f55aeffac1e5816f4))


### Bug Fixes

* add .qodo to .gitignore to prevent tracking of Qodo configuration files ([4953e68](https://github.com/TerrorSquad/php-booster/commit/4953e68a31f4d3b6b44658859ef242956e7e687f))
* add checks for existence of require and require-dev in integrate_booster.sh ([af8a408](https://github.com/TerrorSquad/php-booster/commit/af8a40833412249e62233acf0d554fb39cefabc5))
* add cleanup option to main function ([3e5b957](https://github.com/TerrorSquad/php-booster/commit/3e5b957177e067b7474920760bf73c263e5d1db6))
* add error handling for missing .gitignore file and improve reading method in update_gitignore function ([b8aad4e](https://github.com/TerrorSquad/php-booster/commit/b8aad4ea76f9766afce430fae1986aca7d191dd4))
* add psalm.xml to code quality tools copy and update .gitignore handling ([2ab3ed7](https://github.com/TerrorSquad/php-booster/commit/2ab3ed7817aac99f1dc5a84d548df99faca404fb))
* add reminder to run 'ddev restart' after integration completion in integrate_booster.sh ([ff2e26b](https://github.com/TerrorSquad/php-booster/commit/ff2e26beb726df6a31fa18dceaf4356617d847e7))
* add support for non-DDEV projects in integrate_booster.sh for improved compatibility ([a50b8b5](https://github.com/TerrorSquad/php-booster/commit/a50b8b5facf3dbc3cde9e8e4607b02188f4a47d9))
* add xdebug-local.ini to .gitignore for improved environment configuration ([cbdc37f](https://github.com/TerrorSquad/php-booster/commit/cbdc37f1ce5e702efdb54cd2c6125c20fff3135b))
* adjust indentation for better readability in pre-commit hook ([dd2ac65](https://github.com/TerrorSquad/php-booster/commit/dd2ac65de39c80348daa892bfbb3442bd7fb5a17))
* configure github workflow to build nuxt documentation ([158a0bf](https://github.com/TerrorSquad/php-booster/commit/158a0bf9d59cb758d72178561ec517cb6211c3f1))
* configure GitHub workflow to build Nuxt documentation and install bun with Volta ([6394592](https://github.com/TerrorSquad/php-booster/commit/63945922d905d8134af603ae46e18f65dfe02811))
* coping folders into project root ([466c4db](https://github.com/TerrorSquad/php-booster/commit/466c4dbd54325b1bd91e7d879356d1d5bdfe8599))
* copy contents of .ddev directories, not directories themselves ([222557b](https://github.com/TerrorSquad/php-booster/commit/222557be274a0d0fd004b723249ef67869874dc1))
* correct autoload path in API documentation script ([c8e36df](https://github.com/TerrorSquad/php-booster/commit/c8e36dfc97b3f96cdd5bf724204e212fba23ece4))
* correct command for running test coverage in pre-push hook ([818029c](https://github.com/TerrorSquad/php-booster/commit/818029c52bf59488612cec0d87cd6c17563915c9))
* correct IS_DDEV logic in runner.sh to ensure proper command execution ([a1293c7](https://github.com/TerrorSquad/php-booster/commit/a1293c7f7794f8d8c5e13ee775dd1a1c653e0c67))
* correct nginx configuration file path in update_nginx_config function ([6291fa2](https://github.com/TerrorSquad/php-booster/commit/6291fa2e07a5c7b2956ff40dd7b04fcf106358aa))
* don't install node with volta immediately ([7665749](https://github.com/TerrorSquad/php-booster/commit/76657491d62360e8c1c270a1d4f0ee8e9ed2dfae))
* enhance .gitignore management by adding multiple entries and improving removal logic ([6cbae62](https://github.com/TerrorSquad/php-booster/commit/6cbae62fac1d190ffbcc28922816c632307df793))
* enhance package presence check in add_code_quality_tools function ([12602b1](https://github.com/TerrorSquad/php-booster/commit/12602b137d4dcbc1d3dcc2a3e30bf7b2f3de85c3))
* enhance runner.sh to support execution inside or outside DDEV container ([0c24867](https://github.com/TerrorSquad/php-booster/commit/0c24867e7dd58fb0ddcbd2e5043db8e2283a2ad2))
* enhance script merging logic in integrate_booster.sh for better compatibility ([acea805](https://github.com/TerrorSquad/php-booster/commit/acea805feab320af8714a5e057f26e26e303bf09))
* ensure correct xdebug.client_host configuration for macOS ([ae1d025](https://github.com/TerrorSquad/php-booster/commit/ae1d025b1dcb2417659e02d6da667bb40ad44578))
* ensure no trailing whitespaces in staged files for pre-commit hook ([80fdea3](https://github.com/TerrorSquad/php-booster/commit/80fdea31bb244b0612eaf9bb3a01bf357c38c83a))
* ensure ticket ID extraction from branch name and add error handling ([3eb6afc](https://github.com/TerrorSquad/php-booster/commit/3eb6afc89f7126fb70121bcc4489a2676a15d339))
* **hooks:** unbound variable fix in pre-commit hook ([6ab0abb](https://github.com/TerrorSquad/php-booster/commit/6ab0abb58c22b3fefbe5f5a83c1cc72d5d7755e1))
* implement dynamic merging of scripts in composer.json for improved compatibility ([209dce0](https://github.com/TerrorSquad/php-booster/commit/209dce012b425e6de476fb0ea77a8bff2bee8dc7))
* improve DDEV cleanup performance ([e271465](https://github.com/TerrorSquad/php-booster/commit/e2714654aeb4e66522f336cf916e485be966b8f0))
* install node 22.8.0 ([c2cbc41](https://github.com/TerrorSquad/php-booster/commit/c2cbc41c8112fa06d8ea31fe775d37087404494d))
* modify is_ddev_project function to return integer values instead of exit status ([3a6f9e8](https://github.com/TerrorSquad/php-booster/commit/3a6f9e8526414bedf2b66bcdc3ea07e955d0b66f))
* modify is_ddev_project function to return status instead of printing error message ([25502a0](https://github.com/TerrorSquad/php-booster/commit/25502a0a4584d834b8f862219c0a902878cd503f))
* optimize dependency installation in integrate_booster.sh for improved readability and performance ([748aaab](https://github.com/TerrorSquad/php-booster/commit/748aaabc3b5161c4d2cd233d6e17b4cb95007ca4))
* pass arguments to git hook scripts for improved functionality ([e4e376e](https://github.com/TerrorSquad/php-booster/commit/e4e376ed3696ee70c05a9429ba61858fe0e7b3eb))
* refactor merge_scripts function in integrate_booster.sh for improved array merging logic ([945fa7c](https://github.com/TerrorSquad/php-booster/commit/945fa7c981f0241e1200faf21c361c2a9dc36ce4))
* remove DDEV generated comment from nginx configuration ([2b86518](https://github.com/TerrorSquad/php-booster/commit/2b86518853803e7e30202a8fce2e2f5801d0f73a))
* remove hostname and project name checks from git hooks setup script for simplification ([963b1f6](https://github.com/TerrorSquad/php-booster/commit/963b1f672a0b66d72523f3985862781a0cdf4f7b))
* remove php-booster from searching php dirs ([09232b1](https://github.com/TerrorSquad/php-booster/commit/09232b122323e38a8c3b1fdd3f3ecab4799504c8))
* remove quotes around $FILES in pre-commit hook for consistency ([48c9bc5](https://github.com/TerrorSquad/php-booster/commit/48c9bc5c344c9eaf93c9fe8fd6d03aa13bd08b38))
* remove quotes, allow globbing ([dfe68e5](https://github.com/TerrorSquad/php-booster/commit/dfe68e5033d2168d8576acd6d8d6ff400063635b))
* remove redundant deletion of lines in update_gitignore function ([57d5258](https://github.com/TerrorSquad/php-booster/commit/57d5258bf70b3ca123a5da140e7ac62c420591a4))
* remove temporary composer.json file during script merging for improved clarity ([361f081](https://github.com/TerrorSquad/php-booster/commit/361f081476648c919bf0551888ac4c1ad6cb08ab))
* remove tmp files ([d57ecfe](https://github.com/TerrorSquad/php-booster/commit/d57ecfe17d7cc56af92c38878549398c2cf7082b))
* remove volta.yarn node from package.json ([4d362b8](https://github.com/TerrorSquad/php-booster/commit/4d362b8c6d934a2d79f4625363a8fad4b3cf1647))
* rename check_ddev_project function to is_ddev_project for clarity ([559f9eb](https://github.com/TerrorSquad/php-booster/commit/559f9eb6be7996a4cad80b65b67831420d9018a0))
* reorder steps ([cec2b3e](https://github.com/TerrorSquad/php-booster/commit/cec2b3ed5ec72bd967bde55c4108209cc788bbf6))
* run ddev start multiple times in case of failure ([83a0742](https://github.com/TerrorSquad/php-booster/commit/83a074260a531961a222ee9ad5da700d0fda57af))
* set COMPOSER_MEMORY_LIMIT to unlimited in integrate_booster.sh ([9e787bd](https://github.com/TerrorSquad/php-booster/commit/9e787bdf89ddbb2b9b01c7f9fab5bf7070f49a4c))
* set COMPOSER_MEMORY_LIMIT=-1 to composer commands ([c688913](https://github.com/TerrorSquad/php-booster/commit/c6889130877e78e7a3e0cf8fcf239c387c0999d3))
* set pnpm in packageManager node ([5239a9e](https://github.com/TerrorSquad/php-booster/commit/5239a9e286db99cd19d11db88d795b5de6e02151))
* simplify ignore_lines declaration in integrate_booster.sh ([5ccb401](https://github.com/TerrorSquad/php-booster/commit/5ccb401c2a4b17005d390732723a1940e58fa2ed))
* start and restart ddev when needed ([31f2307](https://github.com/TerrorSquad/php-booster/commit/31f23077c82011d9d5a50433301f2f537c4fcb78))
* streamline dependency installation in integrate_booster.sh for improved efficiency ([2d2f721](https://github.com/TerrorSquad/php-booster/commit/2d2f721475bad26bf3168f990daabfc0338e0733))
* Update build documentation workflow to install bun and add it to PATH ([fc77d75](https://github.com/TerrorSquad/php-booster/commit/fc77d75d7dca10c0aea36d5e6c647788077c5792))
* Update build documentation workflow to install bun in the docs directory ([cf4f801](https://github.com/TerrorSquad/php-booster/commit/cf4f80161b0988f249b9e7122e8c86741636d568))
* update build documentation workflow to install bun without Volta ([45a7e02](https://github.com/TerrorSquad/php-booster/commit/45a7e02dc3096ba89fa0227d6d413a277ff06d26))
* Update build documentation workflow to install bun without Volta ([325e97e](https://github.com/TerrorSquad/php-booster/commit/325e97edb54e353004a31febf85921bc7c7c3a7f))
* Update build documentation workflow to use correct path for artifact upload ([89b90e9](https://github.com/TerrorSquad/php-booster/commit/89b90e945ff7a2d369858092e16bd3a57d0ce379))
* update conditional checks in integrate_booster.sh to use integer comparison ([63210a1](https://github.com/TerrorSquad/php-booster/commit/63210a145c219245f22de784d9a5603df2a5f8be))
* update development dependencies in composer.json to latest versions ([6f6ff8d](https://github.com/TerrorSquad/php-booster/commit/6f6ff8d54b2a55e81d629f9a6775a10d24cc3df6))
* update ecs rules ([9ae7979](https://github.com/TerrorSquad/php-booster/commit/9ae79797f44bc2f96e2bc170e5c9e1e3365f2888))
* update file copy command in integrate_booster.sh for web-build directory ([331dea3](https://github.com/TerrorSquad/php-booster/commit/331dea3e9d2add95dfb7b246e6cc583320ac4d2a))
* update integrate_booster.sh to conditionally remove .vscode from .gitignore ([4cf2753](https://github.com/TerrorSquad/php-booster/commit/4cf2753a6d47268b2ba75e7a4d408a4799ebebd0))
* update integrate_booster.sh to enhance dependency management in composer.json ([3399316](https://github.com/TerrorSquad/php-booster/commit/339931628abd49eb70e971ff95c700b1d26a7b5a))
* update integrate_booster.sh to use integer comparison for DDEV project checks ([e7a9ec3](https://github.com/TerrorSquad/php-booster/commit/e7a9ec3c7a19073b7dce50cf5cd9b8921eb9a7d6))
* update is_ddev_project function to check for DDEV directory presence correctly ([04be529](https://github.com/TerrorSquad/php-booster/commit/04be5290ac5b8336fe12099f686496ec85708a20))
* update is_ddev_project function to return early for non-DDEV projects ([1caf5cd](https://github.com/TerrorSquad/php-booster/commit/1caf5cd2d415c1ff27a5fec5e860c5d93bda46fe))
* update IS_DDEV_PROJECT variable to use integer values for improved condition checks ([08af94e](https://github.com/TerrorSquad/php-booster/commit/08af94ea5b646c3011a638d0e1cb552a088f2970))
* update log message to success for clarity in integrate_booster.sh ([1de8db7](https://github.com/TerrorSquad/php-booster/commit/1de8db7302dfaeb90d9ea434b23e6d7a12e2c6ce))
* update Psalm commands in workflows and composer.json for consistency ([dc8ff4b](https://github.com/TerrorSquad/php-booster/commit/dc8ff4be56757847cccd008444b451663ce24044))
* update psalm dependency in composer.json for improved compatibility ([eb8c355](https://github.com/TerrorSquad/php-booster/commit/eb8c3556fbeef6f8018f453aa0b8a3dcfeeab025))
* update README.md handling to create a new file if it doesn't exist ([ea4fd14](https://github.com/TerrorSquad/php-booster/commit/ea4fd14b7ae4e2b53f89e313cfeda604f906fbba))
* update README.md snippet path in integrate_booster.sh ([9948342](https://github.com/TerrorSquad/php-booster/commit/99483426cee53a72d815b4feb6a8c1ed94415e95))
* update test coverage commands in pre-push hook for Pest and PHPUnit ([1ec9a78](https://github.com/TerrorSquad/php-booster/commit/1ec9a78e542330f8feecc690a9478df8d66cb9a1))
* update usage instructions for node, pnpm, and volta commands ([c3b3cc9](https://github.com/TerrorSquad/php-booster/commit/c3b3cc94d551aa556bf71556bc76a15246b2adca))
* update version field in composer.json to 0.3.0 ([c0a5fc9](https://github.com/TerrorSquad/php-booster/commit/c0a5fc9daeaa23020a326328e8385aad37589f40))
* update xdebug configuration and improve test coverage command in composer.json ([b3523f7](https://github.com/TerrorSquad/php-booster/commit/b3523f76c809bc09fd9a8e422ba6500e4fc6a980))
* update_gitignore function now doesn't break the script unexpectedly ([404031b](https://github.com/TerrorSquad/php-booster/commit/404031b1c6484415c4249fb1e27b723ebc186bfe))
* use cp -R (macOS compatible) ([371d46b](https://github.com/TerrorSquad/php-booster/commit/371d46b48d9c45d36f9c7fc4e68a19e854b13864))
