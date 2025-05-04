<?php

declare(strict_types=1);

use PhpCsFixer\Fixer\Import\NoUnusedImportsFixer;
use PhpCsFixer\Fixer\Operator\BinaryOperatorSpacesFixer;
use Symplify\EasyCodingStandard\Config\ECSConfig;

return ECSConfig::configure()
    ->withPaths([
        __DIR__ . '/DIRECTORY',
    ])
    ->withRules([
        NoUnusedImportsFixer::class,
    ])
    ->withPreparedSets(
        psr12: true,
        common: true,
        strict: true,
    )
    ->withPhpCsFixerSets(
        php83Migration: true,
        psr12: true,
        phpCsFixer: true
    )
    ->withConfiguredRule(BinaryOperatorSpacesFixer::class, [
        'default' => 'align',
    ])
    ->withRootFiles();
