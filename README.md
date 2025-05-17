# Blueprint

A curated collection of tools and best practices for PHP development.

## Key Features
- Streamlined local development with [DDEV](https://ddev.com/).
- Static analysis with [PHPStan](https://phpstan.org/) and [Psalm](https://psalm.dev/).
- Automated code formatting with [EasyCodingStandard](https://github.com/symplify/easy-coding-standard).
- Git hooks for quality enforcement.

## Requirements

You need to have DDEV installed. Visit [ddev](https://ddev.com/) for installation instructions.

## Documentation

The documentation is available at [https://terrorsquad.github.io/php-blueprint/](https://terrorsquad.github.io/php-blueprint/)

## Adding to existing PHP Project

To make use of DDEV in your existing PHP project, perform the following:

1. In your PHP project root, check out a new branch and make sure you have no uncommitted changes.

2. Run the following command to integrate the blueprint into your project:

```bash
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-blueprint/main/blueprint/integrate_blueprint.sh | bash
```

3. Follow the instructions on the screen.

4. Commit the changes and push the branch to your repository.


## License
This repository is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
