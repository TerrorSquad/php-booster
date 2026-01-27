<?php

declare(strict_types=1);

use OpenApi\Generator;

require __DIR__ . '/../vendor/autoload.php';

// Change this to the paths of your API classes
$scanPaths = glob('./src');

if (!is_array($scanPaths)) {
    exit('No paths found to scan for OpenAPI documentation.');
}

$generator = new Generator();

$openapi = $generator->generate($scanPaths);

if ($openapi === null) {
    exit('Failed to generate OpenAPI documentation.');
}

$filename = 'openapi/openapi.yml';
$content = $openapi->toYaml();

if (file_put_contents($filename, $content) === false) {
    exit('Unable to write to file ' . $filename);
}

echo 'OpenAPI documentation generated successfully at ' . $filename . PHP_EOL;
