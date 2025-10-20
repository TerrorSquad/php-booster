---
title: "ADR-0001: Use Docus for Documentation"
description: Decision to use Docus.dev as the documentation platform for PHP Booster
---

# ADR-0001: Use Docus for Documentation

## Status

**Accepted**

**Date**: 2024-10-20

**Decision Makers**: PHP Booster Core Team

## Context

PHP Booster needs comprehensive, modern documentation that is:
- Easy to navigate and search
- Attractive and professional-looking
- Simple to maintain and update
- Supports interactive components
- Can be deployed automatically via GitHub Actions
- Supports both light and dark themes
- Provides excellent mobile experience

We evaluated several documentation platforms:

1. **VuePress**: Mature Vue-based SSG, but aging and less actively maintained
2. **Docusaurus**: Popular React-based platform with excellent features
3. **Docus**: Modern Nuxt 3-based documentation platform with Vue components
4. **GitBook**: Commercial solution with great UI but hosting costs
5. **Jekyll/Hugo**: Static site generators requiring more manual setup

## Decision

We will use **Docus** (https://docus.dev) as our documentation platform.

Docus is built on:
- **Nuxt 3**: Latest version of the Vue framework
- **Nuxt Content**: Powerful content management with MDC (Markdown Components)
- **Vue 3**: Allows custom interactive components when needed
- **Nuxt UI**: Beautiful, accessible component library

Key configuration:
- Documentation source: `/docs/content/`
- Deployment: GitHub Pages via GitHub Actions
- Build command: `nuxi generate --preset github_pages`
- Theme customization: `tokens.config.ts`

## Consequences

### Positive Consequences

✅ **Modern Stack**: Built on latest Nuxt 3 and Vue 3 ecosystem  
✅ **Excellent DX**: Fast hot-reload, great error messages, intuitive file-based routing  
✅ **Component Support**: Can embed Vue components directly in markdown (MDC)  
✅ **Built-in Features**: Search, navigation, code highlighting, dark mode out-of-the-box  
✅ **Performance**: Excellent Core Web Vitals scores with SSG  
✅ **Free Hosting**: GitHub Pages deployment at no cost  
✅ **Active Development**: Regular updates and improvements from Nuxt team  
✅ **Beautiful UI**: Professional appearance with minimal configuration

### Negative Consequences

❌ **Nuxt Learning Curve**: Team needs familiarity with Nuxt/Vue ecosystem  
❌ **Build Dependencies**: Requires Node.js toolchain (npm/bun)  
❌ **Smaller Ecosystem**: Fewer themes and plugins compared to Docusaurus  
❌ **Beta Status**: Some Nuxt Content features still maturing

### Neutral Consequences

- Different from PHP ecosystem (JavaScript-based tooling)
- Requires separate build process from main PHP codebase
- Documentation site has its own package.json and dependencies

## Implementation Notes

### Directory Structure

```
docs/
├── content/                    # Markdown content files
│   ├── 0.index.md             # Homepage
│   ├── 1.integration_guide/   # Integration documentation
│   ├── 2.architecture/        # Architecture docs & ADRs
│   ├── 3.tools/               # Tool documentation
│   └── 4.troubleshooting/     # Troubleshooting guides
├── public/                     # Static assets (images, etc.)
├── app.config.ts              # Docus configuration
├── nuxt.config.ts             # Nuxt configuration
├── tokens.config.ts           # Theme tokens
└── package.json               # Dependencies
```

### GitHub Actions Deployment

```yaml
- name: Build the documentation
  run: cd docs && npx nuxt build --preset github_pages

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: docs/.output/public
```

### Content Features

- **File-based routing**: `1.guide/2.setup.md` → `/guide/setup`
- **Front matter**: YAML metadata for page configuration
- **MDC syntax**: Embed Vue components in markdown
- **Auto-generated navigation**: Based on file structure and numbering

## Related Decisions

- [ADR-0002: ZX for Git Hooks](/architecture/adr/adr-0002-zx-git-hooks) - Similar modern tooling philosophy

## References

- [Docus Documentation](https://docus.dev/)
- [Nuxt Content](https://content.nuxtjs.org/)
- [GitHub Pages Deployment](https://github.com/actions/deploy-pages)
- [PHP Booster Documentation Site](https://terrorsquad.github.io/php-booster/)
