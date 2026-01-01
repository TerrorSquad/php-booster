# Code Formatting

> Enforce consistent code style with EasyCodingStandard (ECS) in your PHP projects.

We use [EasyCodingStandard (ECS)](https://github.com/easy-coding-standard/easy-coding-standard) to enforce consistent code style and formatting.

## Usage

Use the following commands, which are also defined as Composer scripts:

- To check your code for style violations:
```bash
composer check-cs
```
- To automatically fix many style violations:
```bash
composer fix-cs
```

If you're using DDEV, you can run these commands within your DDEV environment:

```bash
ddev composer check-cs
ddev composer fix-cs
```

## Configuration

The `ecs.php` file in your project root is where you configure EasyCodingStandard. This file allows you to define the coding standards you want to enforce, choose specific code sniffers, and customize various settings.

---

## Additional Resources

- [EasyCodingStandard Documentation](https://github.com/symplify/easy-coding-standard)
- [List of Available Checkers (Sniffs)](https://github.com/symplify/easy-coding-standard#use-prepared-sets)

**Remember:** Consistent code style is key to a healthy and maintainable codebase. Make EasyCodingStandard an integral part of your development workflow and enjoy the benefits of clean, well-formatted code!
