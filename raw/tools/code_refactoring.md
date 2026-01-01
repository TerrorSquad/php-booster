# Code Refactoring

> Automate code refactoring and PHP upgrades with Rector.

We use [Rector](https://getrector.org/) to automate code refactoring and PHP version upgrades.

## Usage

Use the following commands, which are also defined as Composer scripts:

- To perform a full refactoring of your codebase:```bash
composer rector process
```
- **Dry Run:** It's highly recommended to perform a dry run first to see the proposed changes without actually modifying your code```bash
composer rector process --dry-run
```

If you're using DDEV, you can run these commands within your DDEV environment:

```bash
ddev composer rector process
ddev composer rector process --dry-run
```

## Configuration

The `rector.php` file in your project root is where you configure Rector. This file allows you to select the Rector sets (collections of rules) you want to apply, define custom rules, and adjust various settings.
