<?php

/**
 * Phan configuration for static analysis
 * 
 * This file is used by Phan to analyze PHP code for potential issues.
 * The DIRECTORY placeholder will be replaced with actual PHP directories
 * during the booster integration process.
 * 
 * @see https://github.com/phan/phan/wiki/Phan-Config-Settings
 */

return [
    // Supported values: 'php7.4', 'php8.0', 'php8.1', 'php8.2', 'php8.3'
    'target_php_version' => '8.1',

    // A list of directories that should be parsed for class and
    // method information. After excluding the directories
    // defined in exclude_analysis_directory_list, the remaining
    // files will be statically analyzed for errors.
    //
    // Thus, both first-party and third-party code being used by
    // your application should be included in this list.
    'directory_list' => [
        'DIRECTORY',
        'vendor',
    ],

    // A regex used to match every file name that you want to
    // exclude from parsing. Affects both directory_list and
    // file_list. Default is empty. See exclude_file_list for a list of files.
    'exclude_file_regex' => '@^vendor/.*/(tests?|Tests?)/@',

    // A directory list that defines files that will be excluded
    // from static analysis, but whose class and method
    // information should be included.
    //
    // Generally, you'll want to include the directories for
    // third-party code (such as "vendor/") in this list.
    'exclude_analysis_directory_list' => [
        'vendor/',
    ],

    // The number of processes to fork off during the analysis phase.
    'processes' => 1,

    // Add any issue types (such as 'PhanUndeclaredMethod')
    // here to inhibit them from being reported.
    'suppress_issue_types' => [
        // Add common suppressions here if needed
    ],

    // If true, missing properties will be created when
    // they are first seen. If false, we'll report an
    // error message.
    'allow_missing_properties' => false,

    // Allow null to be cast as any type and for any
    // type to be cast to null.
    'null_casts_as_any_type' => false,

    // If enabled, scalars (int, float, bool, string, null)
    // are treated as if they can cast to each other.
    'scalar_implicit_cast' => false,

    // If true, seemingly undeclared variables in the global
    // scope will be ignored. This is useful for projects
    // with complicated cross-file globals that you have no
    // hope of fixing.
    'ignore_undeclared_variables_in_global_scope' => false,

    // Backwards Compatibility Checking. This is slow
    // and probably not needed.
    'backward_compatibility_checks' => false,

    // If true, check to make sure the return type declared
    // in the doc-block (if any) matches the return type
    // declared in the method signature.
    'check_docblock_signature_return_type_match' => true,

    // If enabled, Phan will act as though it's certain of real return types of a subset of internal functions,
    // even if those return types aren't available in reflection (real types were taken from php documentation).
    'assume_real_types_for_internal_functions' => true,

    // Set to true to enable the baseline file
    // 'use_baseline' => true,
    // 'baseline_path' => '.phan/baseline.php',

    // A list of plugin files to execute.
    'plugins' => [
        // See https://github.com/phan/phan/tree/v5/.phan/plugins for a full list
        'AlwaysReturnPlugin',
        'DollarDollarPlugin',
        'DuplicateArrayKeyPlugin',
        'DuplicateExpressionPlugin',
        'PregRegexCheckerPlugin',
        'PrintfCheckerPlugin',
        'SleepCheckerPlugin',
        'UnreachableCodePlugin',
        'UseReturnValuePlugin',
        'EmptyStatementListPlugin',
        'LoopVariableReusePlugin',
    ],
];
