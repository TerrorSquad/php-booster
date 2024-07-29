<?php

declare(strict_types=1);

use Rector\CodeQuality\Rector\Identical\FlipTypeControlToUseExclusiveTypeRector;
use Rector\CodingStyle\Rector\Closure\StaticClosureRector;
use Rector\Config\RectorConfig;
use Rector\DeadCode\Rector\Cast\RecastingRemovalRector;
use Rector\Set\ValueObject\SetList;
use Rector\TypeDeclaration\Rector\ClassMethod\AddVoidReturnTypeWhereNoReturnRector;

return RectorConfig::configure()
 ->withPaths([
 __DIR__ . '/public',
 __DIR__ . '/src',
 __DIR__ . '/tests',
 ])
 ->withSets([
 SetList::CODE_QUALITY,
 SetList::CODING_STYLE,
 SetList::TYPE_DECLARATION,
 SetList::PRIVATIZATION,
 SetList::EARLY_RETURN,
 ])
 ->withRules([
 AddVoidReturnTypeWhereNoReturnRector::class,
 RecastingRemovalRector::class,
 ])
 ->withSkip([
 FlipTypeControlToUseExclusiveTypeRector::class,
 StaticClosureRector::class,
 ])
 ->withPhpSets(php83: true);
