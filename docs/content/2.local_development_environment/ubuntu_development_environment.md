# Ubuntu development environment

## What is Ubuntu?

Ubuntu is a widely acclaimed Linux distribution renowned for its user-friendliness, stability, and robust community support. It's a versatile powerhouse, favored by developers, system administrators, and enthusiasts alike, for tasks ranging from web development and server management to everyday computing.

[Learn more about Ubuntu](https://ubuntu.com/)

## Why Ubuntu for PHP Development?

Ubuntu stands out as an excellent choice for PHP development due to several key advantages:

* **Rich PHP Ecosystem:** Ubuntu boasts a comprehensive repository of PHP packages and extensions, ensuring you have access to the latest tools and libraries for your projects.
* **Stability & Security:** Ubuntu's LTS (Long Term Support) releases provide a stable foundation for your development environment, with regular security updates and patches.
* **Community & Resources:** Ubuntu's vast and active community offers a wealth of knowledge, tutorials, and support, making it easy to find solutions and learn new techniques.
* **Flexibility & Customization:** Ubuntu's open-source nature allows for extensive customization and tailoring to your specific development workflow.

## Installing Ubuntu on WSL (Windows 11)

Harness the power of Ubuntu within Windows 11 by following these steps:

1. Open the Windows Terminal.
2. Click on the dropdown menu and select **cmd** or **PowerShell**.
3. Type `wsl --install` and press Enter.
4. Follow the on-screen instructions to install Ubuntu.

After installing Ubuntu, you can launch the Ubuntu shell by opening the Windows Terminal and selecting the Ubuntu profile.

[Learn more about installing Ubuntu with WSL](https://learn.microsoft.com/en-us/windows/wsl/install)

## How to use Ubuntu?

To use Ubuntu with WSL, open the Windows Terminal and select the Ubuntu profile. This will launch the Ubuntu shell where you can run Linux commands and utilities.

You can install additional software packages using the `apt` package manager, configure system settings using the `nano` text editor, and manage files and directories using the `ls`, `cd`, and `mkdir` commands.

## How to customize Ubuntu for development?

To customize Ubuntu for development, you can install development tools and libraries using the `apt` package manager. You can also configure the Ubuntu shell by editing the `.bashrc` file, which allows you to set environment variables, aliases, and custom commands.

You can install popular development tools such as Node.js, Python, Ruby, and Java using the `apt` package manager. You can also install code editors such as Visual Studio Code, Sublime Text, and Atom to write and edit code.

## Streamlining Your Development Setup with Ansible

We recommend using the [Griffin](https://terrorsquad.github.io/ansible-post-installation/) to automate the setup of your Ubuntu development environment. This Ansible playbook will handle the installation and configuration of essential tools, including:

* **Zsh shell with Oh My Zsh** for a more productive and customizable terminal experience.
* **Git** for version control.
* **Volta** for managing Node.js versions.
* **Docker** for containerization.
* **DDEV** for local development environments.
* **Visual Studio Code** or **PHPStorm** (your choice).
* And many other useful tools and packages.

## Using the Griffin Ansible Playbook

Please refer to the [Griffin documentation](https://terrorsquad.github.io/ansible-post-installation/) for detailed instructions on using the Ansible playbook to set up your Ubuntu development environment.

## Conclusion

By leveraging the Ansible Post-Installation Playbook, you can significantly streamline the setup of your Ubuntu development environment, saving time and ensuring consistency across different machines. This approach allows you to focus on what matters most: building awesome PHP applications.

## Additional Resources
::list{type="info"}
- [Ansible Documentation](https://docs.ansible.com/)
- [Griffin Ansible Playbook](https://terrorsquad.github.io/ansible-post-installation/)
- [Ubuntu on Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/ubuntu)
::

::alert
Note: If you encounter any issues during the Ansible playbook execution, refer to the playbook's documentation or seek help from the community.
::
