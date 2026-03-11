import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
const mocks = {
  getStagedFiles: vi.fn(),
  runQualityChecks: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
  applyConfigOverrides: vi.fn((tools) => tools),
}

vi.mock('../shared/index.ts', () => ({
  getStagedFiles: mocks.getStagedFiles,
  GitHook: { PreCommit: 'pre-commit' },
  log: {
    info: mocks.logInfo,
    warn: mocks.logWarn,
  },
  runHook: vi.fn((hook, callback) => callback()),
  runQualityChecks: mocks.runQualityChecks,
  loadConfig: mocks.loadConfig,
  applyConfigOverrides: mocks.applyConfigOverrides,
}))

vi.mock('../shared/tools.ts', () => ({
  TOOLS: ['mock-tool'],
}))

describe('Pre-commit Hook', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.loadConfig.mockResolvedValue({})
    mocks.applyConfigOverrides.mockImplementation((tools) => tools)
  })

  it('should skip checks if no files are staged', async () => {
    mocks.getStagedFiles.mockResolvedValue([])

    // Import to trigger execution
    await import('../pre-commit.ts')

    expect(mocks.runQualityChecks).not.toHaveBeenCalled()
    expect(mocks.logInfo).toHaveBeenCalledWith(expect.stringContaining('No files staged'))
  })

  it('should run quality checks when files are staged', async () => {
    mocks.getStagedFiles.mockResolvedValue(['file1.php', 'file2.ts'])
    mocks.runQualityChecks.mockResolvedValue(true)

    // Import to trigger execution
    await import('../pre-commit.ts')

    expect(mocks.runQualityChecks).toHaveBeenCalledWith(['file1.php', 'file2.ts'], ['mock-tool'])
  })

  it('should skip quality checks when config is null (no config file)', async () => {
    mocks.getStagedFiles.mockResolvedValue(['file1.php'])
    mocks.loadConfig.mockResolvedValue(null)

    await import('../pre-commit.ts')

    expect(mocks.runQualityChecks).not.toHaveBeenCalled()
  })
})
