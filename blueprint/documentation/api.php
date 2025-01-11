<?php

declare(strict_types=1);

use OpenApi\Generator;

require  __DIR__ . '/../vendor/autoload.php';

// Change this to the paths of your API classes
$scanPaths = glob('./src');

$openapi = Generator::scan($scanPaths);

$filename = 'documentation/openapi.yml';
$content  = $openapi->toYaml();

if (file_put_contents($filename, $content) === false) {
    exit('Unable to write to file ' . $filename);
}

echo 'OpenAPI documentation generated successfully at ' . $filename . PHP_EOL;
