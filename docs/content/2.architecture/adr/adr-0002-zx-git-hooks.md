---
title: "ADR-0002: Use ZX for Git Hooks Implementation"
description: Decision to use Google ZX for implementing Git hooks instead of shell scripts
---

# ADR-0002: Use ZX for Git Hooks Implementation

## Status

**Accepted**

**Date**: 2024-10-20

**Decision Makers**: PHP Booster Core Team

## Context

PHP Booster needs robust Git hooks that:
- Work consistently across different operating systems (Linux, macOS, Windows)
- Are maintainable and testable
- Can handle complex logic (branch validation, commit message linting, ticket appending)
- Provide clear error messages and colored output
- Share common functionality across multiple hooks
- Execute securely without shell injection vulnerabilities

We considered several approaches:

1. **Bash Shell Scripts**: Traditional approach, OS-specific challenges
2. **Node.js Scripts**: Cross-platform but verbose with async handling
3. **Python Scripts**: Good tooling but additional dependency
4. **Google ZX**: JavaScript-based shell scripting with modern syntax
5. **Husky Native**: Limited to pre-defined hook types

## Decision

We will implement all Git hooks using **Google ZX** (https://github.com/google/zx).

ZX provides:
- JavaScript/TypeScript syntax with top-level await
- Cross-platform shell command execution
- Built-in utilities (chalk for colors, fs-extra, etc.)
- Secure command interpolation preventing injection attacks
- Promise-based execution for better error handling

Architecture:
- Hook entry points: `tools/git-hooks/{hook-name}.mjs`
- Shared utilities: `tools/git-hooks/shared/utils.mjs`
- Configuration: Hook scripts are linked via package.json scripts

## Consequences

### Positive Consequences

✅ **Cross-Platform**: Works identically on Windows, macOS, and Linux  
✅ **Modern Syntax**: Clean JavaScript/TypeScript with async/await  
✅ **Type Safety**: Can use TypeScript when needed  
✅ **Shared Code**: Common utilities easily shared across hooks  
✅ **Rich Ecosystem**: Access to npm packages when needed  
✅ **Security**: Automatic escaping prevents shell injection  
✅ **Debugging**: Standard JavaScript debugging tools  
✅ **Testability**: Can unit test hook logic easily

### Negative Consequences

❌ **Node Dependency**: Requires Node.js in development environment  
❌ **Startup Time**: Slight overhead compared to pure bash (minimal impact)  
❌ **Learning Curve**: Team needs JavaScript knowledge for hook maintenance  
❌ **Additional Dependency**: One more tool in the stack

### Neutral Consequences

- Different from traditional shell script hooks (clearer for most developers)
- Hook scripts are `.mjs` files instead of shell scripts
- Requires ZX installation via npm (included in package.json)

## Implementation Notes

### Shared Utilities Library

`tools/git-hooks/shared/utils.mjs` provides:
- Colored console output (success, error, warning, info)
- Git command wrappers (getCurrentBranch, getCommitMessage)
- Configuration loading
- Validation helpers

```javascript
import { chalk } from 'zx';

export function success(message) {
  console.log(chalk.green('✓'), message);
}

export function error(message) {
  console.error(chalk.red('✗'), message);
}

export async function getCurrentBranch() {
  const { stdout } = await $`git rev-parse --abbrev-ref HEAD`;
  return stdout.trim();
}
```

### Hook Example: commit-msg

```javascript
#!/usr/bin/env zx

import { error, success, warning } from './shared/utils.mjs';

const commitMsgFile = process.argv[3];
const commitMsg = await fs.readFile(commitMsgFile, 'utf8');

// Validate commit message
if (!isValidCommitMsg(commitMsg)) {
  error('Invalid commit message format');
  process.exit(1);
}

success('Commit message is valid');
```

### Integration with Package Scripts

```json
{
  "scripts": {
    "prepare": "husky install",
    "test:hooks": "zx tools/git-hooks/tests/test-all.mjs"
  }
}
```

### Security Benefits

ZX automatically escapes variables in template literals:
```javascript
// Safe - ZX escapes the variable
await $`git commit -m ${userInput}`;

// Manual string concatenation would be vulnerable:
// await $`git commit -m "${userInput}"`; // DON'T DO THIS
```

## Related Decisions

- [ADR-0001: Docus for Documentation](./adr-0001-docus-documentation.md) - Similar modern tooling approach

## References

- [Google ZX GitHub Repository](https://github.com/google/zx)
- [ZX Documentation](https://google.github.io/zx/)
- [PHP Booster Git Hooks Implementation](../../../booster/tools/git-hooks/)
- [Shared Utilities](../../../booster/tools/git-hooks/shared/utils.mjs)
