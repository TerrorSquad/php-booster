#!/usr/bin/env bash

# Check if blueprint repository is already cloned
if [ ! -d "php-blueprint" ]; then
  echo "Cloning PHP Blueprint repository..."
  git clone https://github.com/TerrorSquad/php-blueprint.git
else
  echo "PHP Blueprint repository already exists. Updating..."
  cd php-blueprint
  git pull
  cd ..
fi

# Backup existing project files (optional but recommended)
echo "Creating a backup of your project files (optional)..."
read -p "Do you want to create a backup? (y/n): " choice
if [ "$choice" == "y" ]; then
  tar -czf project_backup_$(date +%Y%m%d_%H%M%S).tar.gz .
  echo "Backup created successfully."
fi

# Copy essential files and directories
echo "Copying Blueprint files and directories..."
cp -r php-blueprint/.ddev .
cp -r php-blueprint/.github .
cp -r php-blueprint/.vscode .
cp -r php-blueprint/tools .
cp php-blueprint/package.json php-blueprint/pnpm-lock.dist php-blueprint/commitlint.config.js .
cp php-blueprint/rector.php php-blueprint/phpstan.neon.dist php-blueprint/ecs.php .
cp -r php-blueprint/documentation .

# Merge .ddev/config.yaml (handle conflicts manually if necessary)
echo "Merging .ddev/config.yaml..."
if [ -f ".ddev/config.yaml" ]; then
  echo "Existing .ddev/config.yaml found. Please merge the following configuration manually:"
  cat php-blueprint/.ddev/config.yaml
else
  cp php-blueprint/.ddev/config.yaml .ddev/
fi

# Update composer.json
echo "Updating composer.json..."
jq -s '.[0].scripts += .[1].scripts | .[0]["require-dev"] += .[1]["require-dev"]' composer.json php-blueprint/composer.json >tmp.$$.json && mv tmp.$$.json composer.json

# Install Composer and Node dependencies within DDEV
echo "Installing dependencies within DDEV..."
ddev start
ddev composer install
ddev pnpm install

# Enhance README.md (manual step for now)
echo "Please add the following section to your README.md:"
cat <<EOF
## Local Development Environment

This project uses [DDEV](https://ddev.com/) for a streamlined local development setup.

1. Clone the repository.
2. Install DDEV.
3. Run $(ddev start).
4. Run $(ddev composer install).
5. Run $(ddev pnpm install).

The project will be accessible at $(https:// <project-name >.ddev.site/).

### Working with PHP

* Execute PHP commands within DDEV using $(ddev php).
* Run Composer commands within DDEV using $(ddev composer).

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](.github/CONTRIBUTING.md) guide for details.
EOF

echo "Integration complete! Remember to review and adjust the merged .ddev/config.yaml and add the provided README section."
