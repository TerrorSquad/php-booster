---
title: Windows Subsystem for Linux (WSL)
navigation: true
layout: default
---

# Windows Subsystem for Linux (WSL)

## What is WSL?

WSL, or the Windows Subsystem for Linux, is a groundbreaking feature that enables you to run a genuine Linux environment directly within Windows, without the need for dual-booting or virtual machines. It essentially bridges the gap between Windows and Linux, allowing you to seamlessly execute Linux commands, utilities, and even graphical applications on your Windows machine.

[Learn more about WSL](https://docs.microsoft.com/en-us/windows/wsl/)

## Why use WSL for PHP Development?

WSL is a game-changer for PHP developers for several compelling reasons:

* **Native Linux Environment:** PHP was born and bred on Linux, and many of its tools and configurations are optimized for this environment. WSL provides a true Linux experience, ensuring compatibility and optimal performance for your PHP projects. 
* **Seamless Integration:** WSL seamlessly integrates with your Windows filesystem, making it easy to access and manage your project files from both Windows and Linux. This eliminates the hassle of file sharing or synchronization between different operating systems.
* **Performance Boost:** WSL offers impressive performance, often rivaling that of a native Linux installation. You can enjoy the speed and efficiency of Linux while still working within the familiar Windows environment.
* **Toolchain Compatibility:** Many popular PHP development tools, such as Composer, PHPStan, Psalm, and others, are designed for Linux. WSL ensures you have full access to these tools and their latest versions.

## Installing WSL on Windows 11

Follow these straightforward steps to install WSL on your Windows 11 machine:

1. **Enable the WSL Feature:**
   * Open the **Settings** app.
   * Navigate to **Apps** -> **Optional Features** -> **More Windows features.**
   * Scroll down and check the box next to **"Windows Subsystem for Linux."**
   * Click **"OK"** and restart your computer if prompted.

2. **Install Your Preferred Linux Distribution:**
   * Open the **Microsoft Store.**
   * Search for your desired Linux distribution (e.g., Ubuntu, Debian).
   * Click **"Get"** or **"Install"** to download and install the distribution.
   * Once installed, launch the distribution from the Start menu.
   * You'll be prompted to create a new Linux user account and password. 

## Getting Started with WSL

* **Launch WSL:**
    * Open the **Start menu** and search for your installed Linux distribution (e.g., "Ubuntu").
    * Click on the distribution to launch a Linux terminal window.

* **Basic Commands:**
    * Familiarize yourself with essential Linux commands:
        * `ls` - List files in the current directory.
        * `cd` - Change directory.
        * `mkdir` - Create a new directory.
        * `touch` - Create a new file.
        * `nano` or `vim` - Text editors for editing files.
        * `apt update` and `apt upgrade` - Update your Linux distribution's packages.

* **Install PHP & Tools:**
    * Use your distribution's package manager (e.g., `apt` for Ubuntu) to install PHP and other necessary tools:
        * `sudo apt update`
        * `sudo apt install php php-cli php-fpm php-mysql` (or other required PHP extensions)
        * `sudo apt install composer` (for dependency management)

## Conclusion

::alert{type="success"}
**Key Takeaways:**

  ::list{type="info"}
    -  The learning curve for WSL might be slightly steeper for those unfamiliar with Linux. Be patient and explore the vast resources available online. 
    - Feel free to reach out to the community or online forums if you encounter any challenges. 
    - Have fun exploring the power of WSL for your PHP development!
  ::
::

WSL is a powerful tool that bridges the gap between Windows and Linux, providing PHP developers with a native Linux environment for optimal development and seamless toolchain compatibility. Embrace WSL to elevate your PHP development experience and unlock new levels of productivity.


## Additional Resources

::list{type="info"}
- [Microsoft Docs: Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/)
- [Microsoft Store: Linux on Windows](https://www.microsoft.com/en-us/p/ubuntu/9nblggh4msv6)
- [WSL Tips & Tricks](https://www.omgubuntu.co.uk/tag/wsl) 
::
