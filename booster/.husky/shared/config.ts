import { fs } from 'zx'
import { log } from './core.ts'
import type { HooksConfig, ToolConfig, ToolOverride, CustomToolConfig } from './types.ts'

/**
 * Default config file paths (checked in order)
 */
const CONFIG_PATHS = [
  '.git-hooks.config.json',
  '.githooks.json',
]

/**
 * Cached config to avoid repeated file reads
 */
let _configCache: HooksConfig | null = null

/**
 * Reset the config cache (for testing)
 */
export function resetConfigCache(): void {
  _configCache = null
  _missingFlag = false
}

/**
 * Sentinel value cached when no config file is found.
 * Allows distinguishing "no file" from "empty file".
 */
const MISSING_CONFIG = Symbol('missing')
let _missingFlag = false

/**
 * Load configuration from .git-hooks.config.json or similar.
 * Returns null when no config file is found.
 */
export async function loadConfig(): Promise<HooksConfig | null> {
  // Return cached config if available
  if (_configCache !== null) {
    return _missingFlag ? null : _configCache
  }

  // Check environment variable for custom path
  const envPath = process.env.GIT_HOOKS_CONFIG
  if (envPath) {
    if (await fs.pathExists(envPath)) {
      _configCache = await readConfigFile(envPath)
      return _configCache
    }
    log.warn(`Config file not found at ${envPath} (from GIT_HOOKS_CONFIG)`)
  }

  // Check default paths
  for (const configPath of CONFIG_PATHS) {
    if (await fs.pathExists(configPath)) {
      _configCache = await readConfigFile(configPath)
      return _configCache
    }
  }

  // No config file found - cache sentinel and return null
  _configCache = {}
  _missingFlag = true
  return null
}

/**
 * Read and parse a config file
 */
async function readConfigFile(path: string): Promise<HooksConfig> {
  try {
    const content = await fs.readFile(path, 'utf-8')
    const config = JSON.parse(content) as HooksConfig

    // Validate basic structure
    if (config.hooks && typeof config.hooks !== 'object') {
      log.warn(`Invalid 'hooks' in ${path} - expected object`)
      return {}
    }

    if (process.env.GIT_HOOKS_VERBOSE === '1') {
      log.info(`Loaded config from ${path}`)
    }

    return config
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn(`Failed to load config from ${path}: ${message}`)
    return {}
  }
}

/**
 * Check if a tool override is a custom tool definition (has 'command' property)
 */
function isCustomTool(override: ToolOverride | CustomToolConfig): override is CustomToolConfig {
  return 'command' in override
}

/**
 * Apply config overrides using the tool definition registry.
 *
 * The system is **purely config-driven**: only tools listed under
 * `hooks.<hookName>.tools` in the config file are executed.
 * The `registry` array is used solely as a name-lookup so users can
 * reference built-in tools by name without repeating every field.
 *
 * @param registry  The TOOLS definition registry (name → full config lookup)
 * @param config    The loaded configuration (must be non-null)
 * @param hookName  Which hook is being configured
 */
export function applyConfigOverrides(
  registry: ToolConfig[],
  config: HooksConfig,
  hookName?: 'preCommit' | 'prePush' | 'commitMsg',
): ToolConfig[] {
  const toolOverrides = (hookName ? config.hooks?.[hookName]?.tools : undefined) ?? {}

  if (Object.keys(toolOverrides).length === 0) {
    return []
  }

  // Build case-insensitive registry lookup: lowercase name → ToolConfig
  const registryLookup = new Map<string, ToolConfig>()
  for (const tool of registry) {
    registryLookup.set(tool.name.toLowerCase(), tool)
  }

  const result: ToolConfig[] = []

  for (const [name, toolConfig] of Object.entries(toolOverrides)) {
    if (toolConfig.enabled === false) continue

    const baseTool = registryLookup.get(name.toLowerCase())

    if (baseTool) {
      // Known tool: merge registry definition with config overrides.
      // Registry provides the name (canonicalised casing).
      const { enabled, ...overrideProps } = toolConfig
      result.push({ ...baseTool, ...overrideProps })
    } else {
      // Unknown name — must be a fully-specified custom tool
      if (!isCustomTool(toolConfig)) {
        log.warn(`Tool '${name}' not found in registry and no 'command' specified - skipping`)
        continue
      }
      const { enabled, ...toolProps } = toolConfig
      result.push({ ...toolProps, name })
    }
  }

  return result
}

/**
 * Check if a hook or feature should be skipped based on config.
 * Returns false when config is null (no config file found).
 */
export function isHookSkippedByConfig(
  key: 'preCommit' | 'prePush' | 'commitMsg' | 'tests' | 'artifacts',
  config: HooksConfig | null,
): boolean {
  if (!config) return false
  return config.skip?.[key] === true
}

/**
 * Apply verbose setting from config.
 * No-ops when config is null.
 */
export function applyVerboseSetting(config: HooksConfig | null): void {
  if (!config) return
  if (config.verbose === true && !process.env.GIT_HOOKS_VERBOSE) {
    process.env.GIT_HOOKS_VERBOSE = '1'
  }
}
