# Blueprint

This repository contains a DDEV configuration alongside various other tools that help us ensure consistency across local environments as well as quality within PHP codebases.

## License

This repository is licensed under the MIT license. See [LICENSE.md](LICENSE.md) for more information.

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
