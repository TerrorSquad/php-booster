import { describe, it, expect } from 'vitest'
import { fs, path } from 'zx'

describe('Renovate Configuration', () => {
  const renovateConfigPath = path.resolve(process.cwd(), 'renovate.json')

  it('should have a valid renovate.json file', async () => {
    const exists = await fs.pathExists(renovateConfigPath)
    expect(exists).toBe(true)
  })

  it('should have valid JSON structure', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    
    // Should not throw when parsing
    const config = JSON.parse(content)
    expect(config).toBeDefined()
  })

  it('should include required renovate schema', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.$schema).toBe('https://docs.renovatebot.com/renovate-schema.json')
  })

  it('should extend base configuration', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.extends).toBeDefined()
    expect(config.extends).toContain('config:base')
  })

  it('should have package rules defined', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.packageRules).toBeDefined()
    expect(Array.isArray(config.packageRules)).toBe(true)
    expect(config.packageRules.length).toBeGreaterThan(0)
  })

  it('should have automerge rule for patch and minor updates', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    const automergeRule = config.packageRules.find(rule => 
      rule.matchUpdateTypes?.includes('minor') && 
      rule.matchUpdateTypes?.includes('patch')
    )
    
    expect(automergeRule).toBeDefined()
    expect(automergeRule.automerge).toBe(true)
    expect(automergeRule.matchCurrentVersion).toBe('!/^0/')
  })

  it('should have dev dependencies grouping rule', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    const devDepsRule = config.packageRules.find(rule => 
      rule.matchDepTypes?.includes('devDependencies')
    )
    
    expect(devDepsRule).toBeDefined()
    expect(devDepsRule.groupName).toBe('dev dependencies')
    expect(devDepsRule.schedule).toContain('every weekend')
  })

  it('should have PHP dependencies grouping rule', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    const phpDepsRule = config.packageRules.find(rule => 
      rule.matchPackagePatterns && 
      rule.groupName === 'PHP dependencies'
    )
    
    expect(phpDepsRule).toBeDefined()
    expect(phpDepsRule.matchPackagePatterns).toBeDefined()
    
    // Verify common PHP package patterns are included
    const patterns = phpDepsRule.matchPackagePatterns
    const hasPhpPatterns = patterns.some(p => 
      p.includes('phpunit/') || 
      p.includes('phpstan/') || 
      p.includes('psalm/') ||
      p.includes('symfony/') ||
      p.includes('doctrine/')
    )
    expect(hasPhpPatterns).toBe(true)
  })

  it('should have correct schedule configuration', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.schedule).toBeDefined()
    expect(config.schedule).toContain('every weekend')
  })

  it('should have appropriate labels', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.labels).toBeDefined()
    expect(config.labels).toContain('dependencies')
    expect(config.labels).toContain('renovate')
  })

  it('should have branch prefix configured', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.branchPrefix).toBeDefined()
    expect(config.branchPrefix).toBe('deps/')
  })

  it('should have timezone configured', async () => {
    const content = await fs.readFile(renovateConfigPath, 'utf8')
    const config = JSON.parse(content)
    
    expect(config.timezone).toBeDefined()
    expect(typeof config.timezone).toBe('string')
  })
})
