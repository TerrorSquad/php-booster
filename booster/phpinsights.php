<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Default Preset
    |--------------------------------------------------------------------------
    |
    | This option controls the default preset that will be used by PHP Insights
    | to make your code reliable, simple, and clean. However, you can always
    | adjust the `Metrics` and `Insights` below to your specific needs.
    |
    | Supported: "default", "laravel", "symfony", "magento2", "drupal", "wordpress"
    |
    */
    'preset' => 'default',

    /*
    |--------------------------------------------------------------------------
    | IDE
    |--------------------------------------------------------------------------
    |
    | This option controls the default IDE used by PHP Insights to open files
    | when you click on them in the terminal. Supported: "textmate", "macvim",
    | "emacs", "sublime", "phpstorm", "atom", "vscode".
    |
    */
    'ide' => 'vscode',

    /*
    |--------------------------------------------------------------------------
    | Exclude Paths
    |--------------------------------------------------------------------------
    |
    | Here you may specify directories and files to exclude from analysis.
    |
    */
    'exclude' => [
        'tests',
        'vendor',
        'node_modules',
        'php-booster',
        '.ddev',
        '.git',
    ],

    /*
    |--------------------------------------------------------------------------
    | Add
    |--------------------------------------------------------------------------
    |
    | Here you can add custom insights or metrics to the default ones.
    |
    */
    'add' => [
        //
    ],

    /*
    |--------------------------------------------------------------------------
    | Remove
    |--------------------------------------------------------------------------
    |
    | Here you can remove specific insights or metrics from the default analysis.
    |
    */
    'remove' => [
        //
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may adjust all the specific configurations for insights and metrics.
    |
    */
    'config' => [
        //
    ],

    /*
    |--------------------------------------------------------------------------
    | Requirements
    |--------------------------------------------------------------------------
    |
    | Here you can set global minimum quality requirements for your code.
    |
    */
    'requirements' => [
        'min-quality' => 80,
        'min-complexity' => 85,
        'min-architecture' => 80,
        'min-style' => 90,
        'disable-security-check' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Threads
    |--------------------------------------------------------------------------
    |
    | Here you can set the number of threads used for parallel processing.
    | By default, it uses max number of CPUs. Set to 1 to disable parallelism.
    |
    */
    'threads' => null,

    /*
    |--------------------------------------------------------------------------
    | Timeout
    |--------------------------------------------------------------------------
    |
    | Maximum time in seconds for each analyzed file. Set to 0 to disable.
    |
    */
    'timeout_seconds' => 60,
];
