---
title: Architectural Decision Records
description: Index of all architectural decisions made in PHP Booster
---

# Architectural Decision Records (ADRs)

Architectural Decision Records (ADRs) document important architectural decisions made during the development of PHP Booster. Each ADR describes the context, decision, and consequences of a particular choice.

## What are ADRs?

ADRs are short documents that capture important architectural decisions along with their context and consequences. They help:
- Preserve the reasoning behind significant decisions
- Provide context for future developers
- Track the evolution of the system architecture
- Avoid revisiting already-resolved issues

## ADR Format

Each ADR follows this structure:

### Title
A short, present-tense statement of the decision (e.g., "Use ZX for Git Hooks Implementation")

### Status
One of: **Proposed** | **Accepted** | **Rejected** | **Deprecated** | **Superseded by ADR-XXX**

### Context
What is the issue that we're seeing that is motivating this decision or change?

### Decision
What is the change that we're proposing and/or doing?

### Consequences
What becomes easier or more difficult to do as a result of this change?

## How to Write an ADR

1. **Identify the Decision**: Recognize when an architectural decision needs documentation
2. **Use the Template**: Copy the [ADR template](/architecture/adr/template)
3. **Fill in Details**: Provide context, the decision, and expected consequences
4. **Number Sequentially**: Name your ADR file as `adr-NNNN-short-title.md`
5. **Submit for Review**: Open a PR with your ADR for team discussion
6. **Update Status**: Once accepted, mark the status as "Accepted"

## Active ADRs

::list{icon="carbon:document"}
- [ADR-0001: Docus for Documentation](/architecture/adr/adr-0001-docus-documentation) - Use Docus.dev for project documentation
- [ADR-0002: ZX for Git Hooks](/architecture/adr/adr-0002-zx-git-hooks) - Implement Git hooks using Google ZX
::

## Superseded ADRs

::alert{type="info"}
No superseded ADRs yet.
::

## Guidelines

### When to Write an ADR

Write an ADR when you:
- Choose between multiple technical approaches
- Make decisions that affect the project's architecture
- Select tools, frameworks, or libraries
- Establish patterns or conventions
- Make breaking changes to existing systems

### When NOT to Write an ADR

Don't write an ADR for:
- Small implementation details
- Obvious decisions with no alternatives
- Temporary workarounds or experiments
- Minor configuration changes

## Benefits of ADRs

✅ **Knowledge Preservation**: Decisions and reasoning are documented for future reference  
✅ **Team Alignment**: Everyone understands why certain choices were made  
✅ **Onboarding**: New team members can understand the project's evolution  
✅ **Decision Quality**: Writing forces thorough consideration of alternatives  
✅ **Accountability**: Clear ownership and reasoning for architectural choices

## See Also

- [ADR Template](/architecture/adr/template) - Template for creating new ADRs
- [Architecture Overview](/architecture/overview) - High-level architecture documentation
