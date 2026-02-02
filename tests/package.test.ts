import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { createMockFs } from './helpers/mock-fs'

describe('Package', () => {
  let virtualFs: ReturnType<typeof createMockFs>

  beforeEach(() => {
    mock.restore()
  })

  afterEach(() => {
    mock.restore()
  })

  describe('constructor', () => {
    test('extracts package name from simple input', async () => {
      virtualFs = createMockFs({
        '/root/nvim': { type: 'directory' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('nvim', '/root')

      expect(pkg.name).toBe('nvim')
      expect(pkg.path).toBe('/root/nvim')
    })

    test('strips ./ prefix from input', async () => {
      virtualFs = createMockFs({
        '/root/nvim': { type: 'directory' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('./nvim', '/root')

      expect(pkg.name).toBe('nvim')
      expect(pkg.path).toBe('/root/nvim')
    })

    test('strips trailing slash from input', async () => {
      virtualFs = createMockFs({
        '/root/nvim': { type: 'directory' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('nvim/', '/root')

      expect(pkg.name).toBe('nvim')
      expect(pkg.path).toBe('/root/nvim')
    })

    test('strips both ./ prefix and trailing slash', async () => {
      virtualFs = createMockFs({
        '/root/nvim': { type: 'directory' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('./nvim/', '/root')

      expect(pkg.name).toBe('nvim')
      expect(pkg.path).toBe('/root/nvim')
    })

    test('throws error for empty package path', async () => {
      virtualFs = createMockFs({})
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')

      expect(() => new Package('', '/root')).toThrow('Invalid package path')
    })
  })

  describe('discoverLinks', () => {
    test('discovers .config/<package> structure', async () => {
      virtualFs = createMockFs({
        '/root/nvim': { type: 'directory' },
        '/root/nvim/.config': { type: 'directory' },
        '/root/nvim/.config/nvim': { type: 'directory' },
        '/root/nvim/.config/nvim/init.lua': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('nvim', '/root')
      const links = await pkg.discoverLinks('/home/user')

      expect(links).toHaveLength(1)
      expect(links[0]?.linkPath).toBe('/home/user/.config/nvim')
      expect(links[0]?.realPath).toBe('/root/nvim/.config/nvim')
    })

    test('discovers root-level dotfiles', async () => {
      virtualFs = createMockFs({
        '/root/zsh': { type: 'directory' },
        '/root/zsh/.zshrc': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('zsh', '/root')
      const links = await pkg.discoverLinks('/home/user')

      expect(links).toHaveLength(1)
      expect(links[0]?.linkPath).toBe('/home/user/.zshrc')
      expect(links[0]?.realPath).toBe('/root/zsh/.zshrc')
    })

    test('discovers multiple dotfiles in same package', async () => {
      virtualFs = createMockFs({
        '/root/zsh': { type: 'directory' },
        '/root/zsh/.zshrc': { type: 'file' },
        '/root/zsh/.zprofile': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('zsh', '/root')
      const links = await pkg.discoverLinks('/home/user')

      expect(links).toHaveLength(2)
      const linkPaths = links.map(l => l.linkPath).sort()
      expect(linkPaths).toEqual(['/home/user/.zprofile', '/home/user/.zshrc'])
    })

    test('discovers deeply nested .config structure', async () => {
      virtualFs = createMockFs({
        '/root/ghostty': { type: 'directory' },
        '/root/ghostty/.config': { type: 'directory' },
        '/root/ghostty/.config/ghostty': { type: 'directory' },
        '/root/ghostty/.config/ghostty/config': { type: 'file' },
        '/root/ghostty/.config/ghostty/shaders': { type: 'directory' },
        '/root/ghostty/.config/ghostty/shaders/blur.glsl': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('ghostty', '/root')
      const links = await pkg.discoverLinks('/home/user')

      // Should symlink the entire ghostty directory, not individual files
      expect(links).toHaveLength(1)
      expect(links[0]?.linkPath).toBe('/home/user/.config/ghostty')
      expect(links[0]?.realPath).toBe('/root/ghostty/.config/ghostty')
    })

    test('handles mixed files and directories', async () => {
      virtualFs = createMockFs({
        '/root/git': { type: 'directory' },
        '/root/git/.gitconfig': { type: 'file' },
        '/root/git/.config': { type: 'directory' },
        '/root/git/.config/git': { type: 'directory' },
        '/root/git/.config/git/ignore': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('git', '/root')
      const links = await pkg.discoverLinks('/home/user')

      expect(links).toHaveLength(2)
      const linkPaths = links.map(l => l.linkPath).sort()
      expect(linkPaths).toEqual([
        '/home/user/.config/git',
        '/home/user/.gitconfig',
      ])
    })

    test('handles leaf directory without matching package name', async () => {
      // When a directory contains files but doesn't match the package name,
      // it should still be symlinked (fallback behavior)
      virtualFs = createMockFs({
        '/root/myapp': { type: 'directory' },
        '/root/myapp/.config': { type: 'directory' },
        '/root/myapp/.config/someapp': { type: 'directory' },
        '/root/myapp/.config/someapp/config.toml': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { Package } = await import('../src/package')
      const pkg = new Package('myapp', '/root')
      const links = await pkg.discoverLinks('/home/user')

      expect(links).toHaveLength(1)
      expect(links[0]?.linkPath).toBe('/home/user/.config/someapp')
    })
  })
})
