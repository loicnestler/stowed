import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { createMockFs } from './helpers/mock-fs'

describe('AutoLink', () => {
  let virtualFs: ReturnType<typeof createMockFs>

  beforeEach(() => {
    mock.restore()
  })

  afterEach(() => {
    mock.restore()
  })

  describe('link mode', () => {
    test('creates symlink when target does not exist', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const link = new AutoLink('/source/file', '/target/file', {})

      await link.apply()

      expect(virtualFs.mocks.symlink).toHaveBeenCalledWith(
        '/source/file',
        '/target/file'
      )
    })

    test('creates parent directories before symlink', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const link = new AutoLink('/source/file', '/target/deep/nested/file', {})

      await link.apply()

      expect(virtualFs.mocks.mkdir).toHaveBeenCalledWith(
        '/target/deep/nested',
        {
          recursive: true,
        }
      )
    })

    test('skips when target already exists', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
        '/target/file': { type: 'symlink', target: '/source/file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {})
      await link.apply()

      expect(virtualFs.mocks.symlink).not.toHaveBeenCalled()
      expect(link.result).toBe(AutoLinkResult.Nothing)
    })

    test('dry run does not create symlink', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {
        dryRun: true,
      })
      await link.apply()

      expect(virtualFs.mocks.symlink).not.toHaveBeenCalled()
      expect(virtualFs.mocks.mkdir).not.toHaveBeenCalled()
      expect(link.result).toBe(AutoLinkResult.Linked)
    })

    test('sets result to Linked on success', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {})
      await link.apply()

      expect(link.result).toBe(AutoLinkResult.Linked)
    })
  })

  describe('unlink mode', () => {
    test('removes symlink when it exists', async () => {
      virtualFs = createMockFs({
        '/target/file': { type: 'symlink', target: '/source/file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const link = new AutoLink('/source/file', '/target/file', {
        unlink: true,
      })

      await link.apply()

      expect(virtualFs.mocks.unlink).toHaveBeenCalledWith('/target/file')
    })

    test('skips when target does not exist', async () => {
      virtualFs = createMockFs({})
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {
        unlink: true,
      })
      await link.apply()

      expect(virtualFs.mocks.unlink).not.toHaveBeenCalled()
      expect(link.result).toBe(AutoLinkResult.Nothing)
    })

    test('dry run does not remove symlink', async () => {
      virtualFs = createMockFs({
        '/target/file': { type: 'symlink', target: '/source/file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {
        unlink: true,
        dryRun: true,
      })
      await link.apply()

      expect(virtualFs.mocks.unlink).not.toHaveBeenCalled()
      expect(link.result).toBe(AutoLinkResult.Unlinked)
    })

    test('sets result to Unlinked on success', async () => {
      virtualFs = createMockFs({
        '/target/file': { type: 'symlink', target: '/source/file' },
      })
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {
        unlink: true,
      })
      await link.apply()

      expect(link.result).toBe(AutoLinkResult.Unlinked)
    })
  })

  describe('error handling', () => {
    test('handles mkdir failure gracefully', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
      })
      virtualFs.mocks.mkdir.mockRejectedValueOnce(
        new Error('Permission denied')
      )
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {})
      await link.apply()

      expect(link.result).toBe(AutoLinkResult.Failed)
    })

    test('handles symlink failure gracefully', async () => {
      virtualFs = createMockFs({
        '/source/file': { type: 'file' },
      })
      virtualFs.mocks.symlink.mockRejectedValueOnce(new Error('File exists'))
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {})
      await link.apply()

      expect(link.result).toBe(AutoLinkResult.Failed)
    })

    test('handles unlink failure gracefully', async () => {
      virtualFs = createMockFs({
        '/target/file': { type: 'symlink', target: '/source/file' },
      })
      virtualFs.mocks.unlink.mockRejectedValueOnce(
        new Error('Permission denied')
      )
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const { AutoLinkResult } = await import('../src/enums')

      const link = new AutoLink('/source/file', '/target/file', {
        unlink: true,
      })
      await link.apply()

      expect(link.result).toBe(AutoLinkResult.Failed)
    })
  })

  describe('pretty formatting', () => {
    test('returns formatted path string', async () => {
      virtualFs = createMockFs({})
      mock.module('node:fs/promises', () => virtualFs.mocks)

      const { AutoLink } = await import('../src/auto-link')
      const link = new AutoLink('/source/file', '/target/file', {})

      expect(link.pretty).toContain('/source/file')
      expect(link.pretty).toContain('/target/file')
    })
  })
})
