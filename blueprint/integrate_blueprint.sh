#!/usr/bin/env bash

echo "Enter the project name (e.g. my-project):"
read -pr "Project name:" PROJECT_NAME

# Check if blueprint repository is already cloned
if [ ! -d "php-blueprint" ]; then
  echo "Downloading PHP Blueprint repository..."

  curl -sSL https://github.com/TerrorSquad/php-blueprint/archive/refs/heads/main.zip -o php-blueprint.zip

  unzip php-blueprint.zip

  mv php-blueprint-main/blueprint php-blueprint

  rm php-blueprint.zip
fi

# Run DDEV configuration

echo "Copying Blueprint files and directories..."
cp -r php-blueprint/.ddev .
echo "Configuring DDEV..."
ddev stop --unlist ${PROJECT_NAME} && ddev config --project-type=php --project-name="${PROJECT_NAME}" --docroot=public --create-docroot

cp -r php-blueprint/.github .
cp -r php-blueprint/.vscode .
cp -r php-blueprint/tools .

# Check if package.json exists

if [ ! -f "package.json" ]; then
  cp php-blueprint/package.json .
  cp php-blueprint/pnpm-lock.dist .
else
  echo "package.json already exists. Updating scripts..."
  jq -s '.[0].scripts += .[1].scripts | .[0]["devDependencies"] += .[1]["devDependencies"] | .[0]["volta"] += .[1]["volta"]' package.json php-blueprint/package.json >tmp.$$.json && mv tmp.$$.json package.json
fi

cp php-blueprint/commitlint.config.js .

cp php-blueprint/rector.php php-blueprint/phpstan.neon.dist php-blueprint/ecs.php .
cp -r php-blueprint/documentation .

# Update composer.json
echo "Updating composer.json..."
jq -s '.[0].scripts += .[1].scripts | .[0]["require-dev"] += .[1]["require-dev"]' composer.json php-blueprint/composer.json >tmp.$$.json && mv tmp.$$.json composer.json

# Install Composer and Node dependencies within DDEV
echo "Installing dependencies within DDEV..."
ddev start
ddev composer install
ddev pnpm install

# Enhance README.md (manual step for now)
echo "Updating README.md with README_SNIPPET.md:"

if [ -f "README.md" ]; then
  cat php-blueprint/README_SNIPPET.md >>README.md
else
  echo "README.md not found. Please add the following section to your README.md:"
  cat php-blueprint/README_SNIPPET.md >README.md
fi

# Replace project name in all files
echo "Replacing project name in all files..."
find . -type f -exec sed -i "s/php-blueprint/${PROJECT_NAME}/g" {} +

echo "Integration complete!"
echo "Please review the changes and commit them to your repository."
