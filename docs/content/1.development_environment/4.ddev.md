---
title: DDEV
navigation: true
layout: default
---

# DDEV: Your Local Development Supercharger

## What is DDEV?

DDEV is an open-source tool that streamlines the setup and management of local development environments for PHP-based projects. It leverages Docker to create isolated, reproducible environments that closely mirror your production setup, eliminating the "it works on my machine" problem.

[Learn more about DDEV](https://ddev.readthedocs.io/en/stable/)

## Why DDEV for PHP Development?

DDEV offers several compelling advantages for PHP developers:

* **Simplified Setup:** DDEV automates the complex configuration of web servers, databases, and other services required for PHP development, saving you time and effort.
* **Consistent Environments:** DDEV ensures that your local development environment closely matches your production environment, reducing the risk of unexpected issues when deploying your code.
* **Portability:** DDEV projects are easily shared and moved between different machines, ensuring consistency and collaboration across your team.
* **Extensibility:** DDEV supports a wide range of PHP frameworks and CMSs, and you can easily customize your environment with additional services or configurations.

## Getting Started with DDEV

1. **Install DDEV (Skip if using Griffin):**
   * If you haven't already installed DDEV, follow the installation instructions for your operating system: [https://ddev.readthedocs.io/en/stable/users/install/](https://ddev.readthedocs.io/en/stable/users/install/) 
   * **Note:** If you used the Griffin setup script, DDEV is already installed as part of the process, so you can skip this step.

2. **Initialize Your Project:**
   * Navigate to your PHP project's root directory in your terminal.
   * Run `ddev config` to create a `config.yaml` file and answer the configuration prompts. DDEV will attempt to auto-detect your project type and suggest suitable defaults.

3. **Start Your Environment:**
   * Run `ddev start` to build and start your DDEV environment. This will create the necessary Docker containers and services.


4. **Access Your Project:**
   * DDEV will provide you with the URL to access your project in your web browser. You can also use `ddev describe` to see detailed information about your environment, including the database credentials.

## Essential DDEV Commands

* `ddev start`: Starts your DDEV environment.
* `ddev stop`: Stops your DDEV environment.
* `ddev restart`: Restarts your DDEV environment.
* `ddev describe`: Displays detailed information about your environment.
* `ddev ssh`: Provides SSH access to the web container.
* `ddev exec <command>`: Executes a command within the web container.
* `ddev logs`: Displays logs from your DDEV environment.

## Conclusion

DDEV is a powerful tool that simplifies and streamlines your local PHP development workflow. By providing consistent, reproducible environments, DDEV empowers you to focus on building great applications without the hassle of complex configurations.

---

## Additional Resources

* [DDEV Official Documentation](https://ddev.readthedocs.io/en/stable/)
* [DDEV Tutorial](https://ddev.readthedocs.io/en/stable/users/quickstart/)
* [DDEV Community](https://ddev.readthedocs.io/en/stable/community/)

Embrace DDEV and unlock a new level of efficiency in your PHP development journey!
