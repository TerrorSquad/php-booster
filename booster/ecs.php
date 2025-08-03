<?php

declare(strict_types=1);

use PhpCsFixer\Fixer\Import\NoUnusedImportsFixer;
use PhpCsFixer\Fixer\Operator\BinaryOperatorSpacesFixer;
use PhpCsFixer\Fixer\Phpdoc\PhpdocToCommentFixer;
use Symplify\EasyCodingStandard\Config\ECSConfig;

return ECSConfig::configure()
    ->withPaths([
        __DIR__ . '/DIRECTORY',
    ])
    /** @phpstan-ignore argument.type */
    ->withRules([
            /** @phpstan-ignore class.notFound */
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
    /** @phpstan-ignore class.notFound,argument.type */
    ->withConfiguredRule(BinaryOperatorSpacesFixer::class, [
        'default' => 'align',
    ])
    ->withRootFiles()
    ->withSkip([
            /** @phpstan-ignore class.notFound */
        PhpdocToCommentFixer::class,
    ])
;
