# Blueprint

This repository contains a DDEV configuration alongside various other tools that help us ensure consistency across local environments as well as quality within PHP codebases.

## Get started

For detailed instructions on how to use this repository, refer to the [Blueprint Documentation](https://terrorsquad.github.io/php-blueprint/).

# License

This project is licensed under the [MIT License](LICENSE.md).

## Requirements

You need to have DDEV installed. Visit [ddev](https://ddev.com/) for installation instructions.

## Adding to existing PHP Project

To make use of DDEV in your existing PHP project, perform the following:

1. Add and configure DDEV

- In your project run `ddev config` and follow the wizard
- Once ddev is configured and running, stop the server with `ddev stop` and copy over the file from this repo into your own repo:
- `.ddev/commands/web/*` - these files contain new commands that will be available as `ddev node` , `ddev pnpm` and `ddev volta`
- `.ddev/php/xdebug.ini` - this is the xdebug configuration for your PHP. Feel free to change the `port` and `mode`, but don't change other settings!
- `.ddev/web-build/*` - these files will allow your new containers to commuicate over the Internet without Zscaler blocking them as well as install `volta` package manager.
- `.ddev/config.yaml` - Do not copy the whole file, only certain lines:

 ```yaml
 xdebug_enabled: true
 omit_containers: [db]
 router_http_port: 6666 # Port to be used for http (defaults to global configuration, usually 80, make sure it doesn't conflict with other ports)
 timezone: Europe/Berlin
 hooks:
 post-start:
 - exec: pnpm install
 - exec: sh ./tools/git-hooks-ddev/setup.sh
 ```

2. Copy over the whole `.github` directory
3. Copy over the whole `.vscode` directory.

 > If you used a custom port in the `.ddev/php/xdebug.ini` be sure to set it in the `.vscode/launch.json` as well

4. Copy over the `tools` directory
5. Copy over the `package.json`, `pnpm-lock.dist` and `commitlint.config.js` files.
6. From the `composer.json` file, copy everything from the `scripts` block into your `composer.json`
7. From the `composer.json` file, add all `require-dev` dependencies to your `composer.json` and install them.
8. Copy over the files `rector.php`, `phpstan.neon.dist`, `ecs.php`
9. Copy over the `documentation` directory to your project.
10. Add this to your README.md

```md
## Local development environment

This project uses [`ddev`](https://ddev.com/) to easily create a local development environment.

1. Clone the repo
2. Install [ddev](https://ddev.com/)
3. Run `ddev start`
4. Run `ddev composer install`
5. Run `ddev pnpm install`

The project will be available at https://<project-name>.ddev.site/

### Working with PHP

To run PHP commands inside ddev run `ddev php`

To run composer inside of ddev run `ddev composer` e.g. `ddev composer install`

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](.github/CONTRIBUTING.md) guide for details on how to get started.
```
