---
title: ADR Template
description: Template for creating new Architectural Decision Records
---

# ADR Template

Use this template to create new Architectural Decision Records. Copy this content and fill in the details for your decision.

## File Naming Convention

Name your ADR file as: `adr-NNNN-short-title.md`

Where:
- `NNNN` is a sequential number (e.g., 0001, 0002, 0003)
- `short-title` is a kebab-case brief description

Example: `adr-0003-use-rector-for-refactoring.md`

---

# Title: [Short Present Tense Statement of Decision]

## Status

[Proposed | Accepted | Rejected | Deprecated | Superseded by [ADR-XXX](adr-XXX-title.md)]

**Date**: [YYYY-MM-DD]

**Decision Makers**: [List key people involved in the decision]

## Context

[Describe the issue, problem, or opportunity that motivates this decision. Include:]

- What is the background?
- What are we trying to achieve?
- What constraints do we face?
- What alternatives did we consider?

## Decision

[Clearly state the decision being made. Be specific about:]

- What exactly are we choosing to do?
- How will it be implemented?
- What are the key technical details?

## Consequences

[Describe the resulting context after applying the decision. Include both positive and negative consequences:]

### Positive Consequences

- What becomes easier?
- What benefits do we gain?
- What problems does this solve?

### Negative Consequences  

- What becomes more difficult?
- What are the trade-offs?
- What new challenges might arise?

### Neutral Consequences

- What changes but is neither clearly positive nor negative?

## Implementation Notes

[Optional: Include specific implementation details, configurations, or code examples if helpful]

```
[code examples if applicable]
```

## Related Decisions

[Optional: Link to related ADRs or reference relevant documentation]

- [ADR-XXXX: Related Decision](adr-XXXX-title.md)
- [Relevant Documentation](/link/to/docs)

## References

[Optional: Include links to external resources, discussions, or research that informed this decision]

- [Article or Documentation](https://example.com)
- [GitHub Discussion](https://github.com/org/repo/discussions/123)
- [Research Paper or Blog Post](https://example.com)

---

## Tips for Writing Good ADRs

1. **Be Concise**: Keep it short and focused on the decision
2. **Provide Context**: Explain why the decision matters
3. **Document Alternatives**: Show what options were considered
4. **Be Honest**: Include both pros and cons
5. **Use Present Tense**: Write as if the decision is happening now
6. **Make it Searchable**: Use clear, specific titles
7. **Link Related Decisions**: Create a web of knowledge
8. **Update When Superseded**: Mark old decisions when they're replaced

## Example Sections

### Good Context Section
```markdown
## Context

Our project has grown to include multiple developers, and we're experiencing
inconsistencies in code style. We need an automated solution that:
- Enforces consistent formatting across the team
- Integrates with our existing CI/CD pipeline
- Supports PHP 8.1+ features
- Can be run both locally and in CI

We considered three options:
1. PHP-CS-Fixer
2. Easy Coding Standard (ECS)
3. PHP CodeSniffer
```

### Good Decision Section
```markdown
## Decision

We will use Easy Coding Standard (ECS) for code formatting because:
- It provides modern, opinionated defaults that match PHP 8.1+ best practices
- It integrates seamlessly with our existing Symfony-based toolchain
- It offers better performance than alternatives
- It supports both checking and automatic fixing

Configuration will be stored in `ecs.php` at the project root.
```

### Good Consequences Section
```markdown
## Consequences

### Positive Consequences
- Consistent code style across all contributors
- Automated formatting reduces code review time
- Easy onboarding for new developers (no manual style guides)
- Fast feedback loop with automatic fixing

### Negative Consequences
- Initial setup time to configure rules
- May require reformatting existing codebase
- Team needs to learn ECS-specific configuration syntax
- Additional CI/CD job increases build time by ~30 seconds

### Neutral Consequences
- Different from projects using PHP-CS-Fixer (migration guide needed)
```
