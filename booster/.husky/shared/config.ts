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
}

/**
 * Load configuration from .git-hooks.config.json or similar
 * Returns empty config if no file found
 */
export async function loadConfig(): Promise<HooksConfig> {
  // Return cached config if available
  if (_configCache !== null) {
    return _configCache
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

  // No config file found - return empty config
  _configCache = {}
  return _configCache
}

/**
 * Read and parse a config file
 */
async function readConfigFile(path: string): Promise<HooksConfig> {
  try {
    const content = await fs.readFile(path, 'utf-8')
    const config = JSON.parse(content) as HooksConfig

    // Validate basic structure
    if (config.tools && typeof config.tools !== 'object') {
      log.warn(`Invalid 'tools' in ${path} - expected object`)
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
 * Create a case-insensitive lookup map for config tools
 * Maps lowercase names to original config keys
 */
function createToolLookupMap(tools: HooksConfig['tools']): Map<string, string> {
  const map = new Map<string, string>()
  if (tools) {
    for (const key of Object.keys(tools)) {
      map.set(key.toLowerCase(), key)
    }
  }
  return map
}

/**
 * Apply config overrides to the default tools array
 * @param defaultTools The default TOOLS array
 * @param config The loaded configuration
 * @returns Modified tools array with overrides applied
 */
export function applyConfigOverrides(
  defaultTools: ToolConfig[],
  config: HooksConfig,
): ToolConfig[] {
  if (!config.tools) {
    return defaultTools
  }

  const result: ToolConfig[] = []
  const processedOverrides = new Set<string>()

  // Create case-insensitive lookup map
  const toolLookup = createToolLookupMap(config.tools)

  // Process existing tools with overrides
  for (const tool of defaultTools) {
    // Case-insensitive lookup: find the config key that matches (ignoring case)
    const configKey = toolLookup.get(tool.name.toLowerCase())
    const override = configKey ? config.tools[configKey] : undefined

    if (!override) {
      // No override - keep original
      result.push(tool)
      continue
    }

    processedOverrides.add(configKey)

    // Check if tool is disabled
    if (override.enabled === false) {
      continue // Skip disabled tool
    }

    if (isCustomTool(override)) {
      // Full custom definition replaces the tool
      result.push({
        ...override,
        name: tool.name,
      })
    } else {
      // Partial override - merge with existing
      result.push({
        ...tool,
        ...(override.args !== undefined && { args: override.args }),
        ...(override.extensions !== undefined && { extensions: override.extensions }),
        ...(override.onFailure !== undefined && { onFailure: override.onFailure }),
        ...(override.parallelGroup !== undefined && { parallelGroup: override.parallelGroup }),
        ...(override.description !== undefined && { description: override.description }),
      })
    }
  }

  // Add new custom tools
  for (const [name, toolConfig] of Object.entries(config.tools)) {
    if (processedOverrides.has(name)) {
      continue // Already processed
    }

    if (!isCustomTool(toolConfig)) {
      log.warn(`Tool '${name}' not found and no 'command' specified - skipping`)
      continue
    }

    if (toolConfig.enabled === false) {
      continue // Skip disabled custom tool
    }

    result.push({
      ...toolConfig,
      name,
    })
  }

  return result
}

/**
 * Check if a hook or feature should be skipped based on config
 */
export function isHookSkippedByConfig(
  key: 'preCommit' | 'prePush' | 'commitMsg' | 'tests' | 'artifacts',
  config: HooksConfig,
): boolean {
  return config.skip?.[key] === true
}

/**
 * Apply verbose setting from config
 */
export function applyVerboseSetting(config: HooksConfig): void {
  if (config.verbose === true && !process.env.GIT_HOOKS_VERBOSE) {
    process.env.GIT_HOOKS_VERBOSE = '1'
  }
}
