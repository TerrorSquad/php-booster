import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('zx', () => ({
  fs: {
    readFile: vi.fn(),
    appendFile: vi.fn(),
  },
  path: {
    dirname: vi.fn(),
    resolve: vi.fn(),
  },
}))

vi.mock('../../validate-branch-name.config.cjs', () => ({
  default: {
    config: {
      types: ['feat', 'fix'],
      ticketIdPrefix: 'JIRA',
      ticketNumberPattern: '\\d+',
      commitFooterLabel: 'Closes',
      requireTickets: true,
      skipped: ['main', 'develop'],
      namePattern: null,
    },
  },
}))

vi.mock('../shared/index.ts', () => ({
  getCurrentBranch: vi.fn(),
  GitHook: { CommitMsg: 'commit-msg' },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  runHook: vi.fn((hook, callback) => callback()), // Execute callback immediately
  runStep: vi.fn((name, callback) => callback()),
  exec: vi.fn(),
}))

// Import the functions to test
// Note: This will execute the top-level code in commit-msg.ts, so we need to ensure side effects are safe (mocked runHook)
import {
  loadConfig,
  processConfig,
  isBranchSkipped,
  extractTicketId,
  appendTicketFooter,
} from '../commit-msg.ts'

import { fs } from 'zx'
import { getCurrentBranch } from '../shared/index.ts'

describe('Commit Message Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration Loading', () => {
    it('should load configuration correctly', () => {
      const config = loadConfig()
      expect(config.types).toEqual(['feat', 'fix'])
      expect(config.ticketIdPrefix).toBe('JIRA')
      expect(config.requireTickets).toBe(true)
    })

    it('should process configuration correctly', () => {
      const rawConfig = loadConfig()
      const processed = processConfig(rawConfig)

      expect(processed.needTicket).toBe(true)
      expect(processed.footerLabel).toBe('Closes')
    })
  })

  describe('Branch Validation', () => {
    it('should identify skipped branches', () => {
      const config = loadConfig()
      expect(isBranchSkipped('main', config)).toBe(true)
      expect(isBranchSkipped('develop', config)).toBe(true)
      expect(isBranchSkipped('feature/test', config)).toBe(false)
    })

    it('should extract ticket IDs correctly', () => {
      const config = loadConfig()

      expect(extractTicketId('feature/JIRA-123-test', config)).toBe('JIRA-123')
      expect(extractTicketId('fix/JIRA-456-bug', config)).toBe('JIRA-456')
      expect(extractTicketId('feature/no-ticket', config)).toBe(null)
      expect(extractTicketId('feature/OTHER-123', config)).toBe(null)
    })
  })

  describe('Ticket Footer Appending', () => {
    it('should append ticket footer if missing', async () => {
      getCurrentBranch.mockResolvedValue('feature/JIRA-123-test')
      fs.readFile.mockResolvedValue('feat: initial commit')
      fs.appendFile.mockResolvedValue()

      const result = await appendTicketFooter('COMMIT_EDITMSG')

      expect(result).toBe(true)
      expect(fs.appendFile).toHaveBeenCalledWith('COMMIT_EDITMSG', '\nCloses: JIRA-123\n')
    })

    it('should not append if already present', async () => {
      getCurrentBranch.mockResolvedValue('feature/JIRA-123-test')
      fs.readFile.mockResolvedValue('feat: initial commit\n\nCloses: JIRA-123')
      fs.appendFile.mockResolvedValue()

      const result = await appendTicketFooter('COMMIT_EDITMSG')

      expect(result).toBe(true)
      expect(fs.appendFile).not.toHaveBeenCalled()
    })

    it('should fail if ticket required but missing in branch', async () => {
      getCurrentBranch.mockResolvedValue('feature/no-ticket')

      const result = await appendTicketFooter('COMMIT_EDITMSG')

      expect(result).toBe(false)
    })

    it('should skip if branch is skipped', async () => {
      getCurrentBranch.mockResolvedValue('main')

      const result = await appendTicketFooter('COMMIT_EDITMSG')

      expect(result).toBe(true)
      expect(fs.appendFile).not.toHaveBeenCalled()
    })
  })
})
