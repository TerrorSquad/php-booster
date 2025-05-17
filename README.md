# Blueprint

A curated collection of tools and best practices for PHP development.

## Key Features
- Streamlined local development (optionally with [DDEV](https://ddev.com/)).
- Static analysis with [PHPStan](https://phpstan.org/) and [Psalm](https://psalm.dev/).
- Automated code formatting with [EasyCodingStandard](https://github.com/symplify/easy-coding-standard).
- Git hooks for quality enforcement.

## Requirements

You can use this blueprint with or without [DDEV](https://ddev.com/).  
If you wish to use DDEV for local development, please install it by following their [installation instructions](https://ddev.com/).

## Documentation

The documentation is available at [https://terrorsquad.github.io/php-blueprint/](https://terrorsquad.github.io/php-blueprint/)

## Adding to an Existing PHP Project

To integrate the blueprint into your existing PHP project:

1. In your PHP project root, check out a new branch and make sure you have no uncommitted changes.

2. Run the following command to integrate the blueprint into your project:

    ```bash
    curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-blueprint/main/blueprint/integrate_blueprint.sh | bash
    ```

3. Follow the instructions on the screen.

4. Commit the changes and push the branch to your repository.

## License
This repository is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
