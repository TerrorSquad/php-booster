# API Documentation

> Generate OpenAPI specifications and documentation with Swagger-PHP and ReDoc.

We use [Swagger-PHP](https://zircote.github.io/swagger-php/) for annotations and [ReDoc](https://github.com/Redocly/redoc) for generating documentation.

## Usage

1. **Annotate Code**: Add Swagger-PHP annotations to your classes and methods.
2. **Generate Spec**:```bash
composer generate-api-spec
```

<br />

**DDEV:**```bash
ddev composer generate-api-spec
```

<br />

This updates `documentation/openapi.yml`.
3. **Generate HTML**:```bash
npm run generate:api-doc:html
```

## Automation

Git hooks automatically regenerate documentation when `openapi.yml` changes.

## Additional Resources

- [Swagger-PHP Documentation](https://zircote.github.io/swagger-php/)
- [ReDoc Documentation](https://github.com/Redocly/redoc)
- [OpenAPI Specification](https://swagger.io/specification/)

**Remember:**

<callout color="green" icon="i-heroicons-check-circle">

- Keep your annotations up-to-date as you make changes to your API
- Consider adding ReDoc or another visualization tool to make your API documentation even more accessible and user-friendly
- Use the generated OpenAPI specification to power other API-related tools and workflows.

</callout>
