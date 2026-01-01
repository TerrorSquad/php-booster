# Renovate

> Automated dependency management with Renovate for PHP projects.

We include a pre-configured [Renovate](https://docs.renovatebot.com/) setup for automated dependency management.

## Configuration

The default `renovate.json` configuration includes:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:base"
  ],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "groupName": "dev dependencies",
      "schedule": ["every weekend"]
    },
    {
      "matchPackagePatterns": ["phpunit/", "phpstan/", "psalm/", "symfony/", "doctrine/", "guzzlehttp/"],
      "groupName": "PHP dependencies"
    }
  ],
  "timezone": "Europe/Paris",
  "schedule": ["every weekend"],
  "labels": ["dependencies", "renovate"],
  "branchPrefix": "deps/"
}
```

### Key Settings

<table>
<thead>
  <tr>
    <th>
      Setting
    </th>
    
    <th>
      Description
    </th>
    
    <th>
      Default Value
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        extends
      </code>
    </td>
    
    <td>
      Base configuration preset
    </td>
    
    <td>
      <code>
        config:base
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        schedule
      </code>
    </td>
    
    <td>
      When to check for updates
    </td>
    
    <td>
      <code>
        every weekend
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        timezone
      </code>
    </td>
    
    <td>
      Timezone for scheduling
    </td>
    
    <td>
      <code>
        Europe/Paris
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        labels
      </code>
    </td>
    
    <td>
      PR labels
    </td>
    
    <td>
      <code>
        dependencies
      </code>
      
      , <code>
        renovate
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        branchPrefix
      </code>
    </td>
    
    <td>
      Branch naming prefix
    </td>
    
    <td>
      <code>
        deps/
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        automerge
      </code>
    </td>
    
    <td>
      Auto-merge stable updates
    </td>
    
    <td>
      Enabled for patch/minor
    </td>
  </tr>
</tbody>
</table>

### Customization

You can customize the configuration after integration by editing `renovate.json` in your project root:

#### Change Update Schedule

```json
{
  "schedule": ["every weekday"]
}
```

#### Adjust Automerge Rules

```json
{
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true
    }
  ]
}
```

#### Customize Grouping

```json
{
  "packageRules": [
    {
      "matchPackagePatterns": ["symfony"],
      "groupName": "Symfony packages"
    }
  ]
}
```

## Enabling Renovate

### On GitHub

1. Install the [Renovate GitHub App](https://github.com/apps/renovate) on your repository
2. Grant necessary permissions (read repo contents, create PRs)
3. Renovate will automatically detect your `renovate.json` configuration
4. Wait for the first pull request with dependency updates

### On GitLab

1. Go to your project's **Settings > Members**
2. Add the Renovate bot user with at least **Developer** role (required for creating merge requests)
3. Configure CI/CD variables if needed:

  - `RENOVATE_TOKEN`: Personal access token with API access (for private repos)
  - `RENOVATE_PLATFORM`: Set to `gitlab`
4. Optional: Set up scheduled pipelines to run Renovate at regular intervals
5. Renovate will start creating merge requests based on your `renovate.json` configuration

For more details, see [Renovate GitLab documentation](https://docs.renovatebot.com/modules/platform/gitlab/).

### Self-Hosted

For self-hosted Renovate installations:

1. Install Renovate following the [self-hosting guide](https://docs.renovatebot.com/self-hosting/)
2. Configure your Renovate instance to scan repositories with `renovate.json` files
3. Set up environment variables:

  - `RENOVATE_PLATFORM`: Your git platform (`github`, `gitlab`, `bitbucket`, etc.)
  - `RENOVATE_ENDPOINT`: Your platform's API endpoint
  - `RENOVATE_TOKEN`: Authentication token with repository access
4. The provided `renovate.json` configuration works with self-hosted instances
5. Consider customizing the schedule to match your team's workflow

**Example Docker command:**

```bash
docker run --rm \
  -e RENOVATE_PLATFORM=gitlab \
  -e RENOVATE_ENDPOINT=https://gitlab.example.com/api/v4 \
  -e RENOVATE_TOKEN=your-token \
  -v /path/to/config:/usr/src/app/config \
  renovate/renovate
```

For more advanced setups, refer to the [official self-hosting documentation](https://docs.renovatebot.com/self-hosting/).

## Package Support

Renovate automatically detects and updates:

- **PHP** - Composer dependencies (`composer.json`)
- **JavaScript** - npm/pnpm/yarn packages (`package.json`)
- **Docker** - Base images in Dockerfiles
- **GitHub Actions** - Action versions in workflows

## Best Practices

### Review Strategy

- ✅ Auto-merge patch updates (bug fixes)
- ✅ Auto-merge minor updates (new features, backward compatible)
- ⚠️ Manually review major updates (breaking changes)
- ⚠️ Always review updates for security-critical packages

### Repository Settings

- Enable **branch protection** rules on your main branch
- Require **status checks** to pass before merging
- Consider requiring **code owner reviews** for major updates

### Testing

- Ensure your **CI/CD pipeline** runs on Renovate PRs
- Include **integration tests** to catch breaking changes
- Use **semantic versioning** in your own packages

## Benefits

### For Developers

- 🔒 **Improved security** through timely dependency updates
- 📈 **Stay current** with latest package features
- 🕐 **Time savings** from automated update management
- 📊 **Clear visibility** of dependency health

### For Teams

- 🛡️ **Reduced vulnerabilities** through faster patching
- 🔄 **Consistent updates** across all projects
- 📝 **Audit trail** with automated PR history
- 🎯 **Focused reviews** on meaningful changes

## Troubleshooting

### Renovate Not Creating PRs

- Verify the Renovate app is installed and has access
- Check that `renovate.json` is valid JSON
- Review Renovate logs in your repository settings
- Ensure dependencies are not pinned or locked

### Too Many PRs

- Adjust the schedule to less frequent checks
- Enable more aggressive grouping rules
- Increase the automerge criteria

### Failing Status Checks

- Review your CI/CD pipeline configuration
- Check if tests need updates for new package versions
- Consider updating test fixtures or mocks

### Merge Conflicts

- Keep your base branch up to date
- Rebase Renovate branches regularly
- Enable Renovate's rebase options

## Integration with Other Tools

Renovate works seamlessly with:

- **GitHub Actions** - Automatically triggers CI checks
- **Composer Audit** - Security vulnerability scanning
- **PHPStan/Psalm** - Static analysis on updated code
- **Git Hooks** - Pre-commit validation still applies

## Advanced Configuration

### Extending Presets

```json
{
  "extends": [
    "config:base",
    ":dependencyDashboard",
    ":semanticCommits",
    ":automergeDigest"
  ]
}
```

### Custom Managers

```json
{
  "regexManagers": [
    {
      "fileMatch": ["^Dockerfile$"],
      "matchStrings": ["ENV PHP_VERSION=(?<currentValue>.*?)\\n"],
      "datasourceTemplate": "github-releases",
      "depNameTemplate": "php/php-src"
    }
  ]
}
```

### Notifications

```json
{
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

## Resources

- [Renovate Documentation](https://docs.renovatebot.com/)
- [Configuration Options](https://docs.renovatebot.com/configuration-options/)
- [Preset Configs](https://docs.renovatebot.com/presets-default/)
- [GitHub App](https://github.com/apps/renovate)

The Renovate integration ensures your dependencies stay current, secure, and well-maintained with minimal manual effort.
