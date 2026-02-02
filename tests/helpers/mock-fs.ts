import { mock } from 'bun:test'

interface VirtualFile {
  type: 'file' | 'directory' | 'symlink'
  target?: string // for symlinks
}

// biome-ignore lint/suspicious/noExplicitAny: Required for generic mock function type
type MockFn<T extends (...args: any[]) => any> = ReturnType<typeof mock<T>>

export interface MockFs {
  stat: MockFn<
    (path: string) => Promise<{ isFile(): boolean; isDirectory(): boolean }>
  >
  readdir: MockFn<(path: string) => Promise<string[]>>
  mkdir: MockFn<
    (path: string, options?: { recursive?: boolean }) => Promise<void>
  >
  symlink: MockFn<(target: string, path: string) => Promise<void>>
  unlink: MockFn<(path: string) => Promise<void>>
  exists: MockFn<(path: string) => Promise<boolean>>
}

/**
 * Creates a virtual filesystem and returns mock implementations
 * for node:fs/promises functions.
 */
export function createMockFs(initialFiles: Record<string, VirtualFile> = {}) {
  const files = new Map(Object.entries(initialFiles))

  const mockStat = mock(async (path: string) => {
    const file = files.get(path)
    if (!file) {
      const err = new Error(`ENOENT: no such file or directory, stat '${path}'`)
      ;(err as NodeJS.ErrnoException).code = 'ENOENT'
      throw err
    }
    return {
      isFile: () => file.type === 'file',
      isDirectory: () => file.type === 'directory',
      isSymbolicLink: () => file.type === 'symlink',
    }
  })

  const mockReaddir = mock(async (path: string) => {
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path
    const prefix = `${normalizedPath}/`
    const children = new Set<string>()

    for (const key of files.keys()) {
      if (key.startsWith(prefix) && key !== normalizedPath) {
        const rest = key.slice(prefix.length)
        const child = rest.split('/')[0]
        if (child) children.add(child)
      }
    }

    return [...children]
  })

  const mockMkdir = mock(
    async (_path: string, _options?: { recursive?: boolean }) => {
      // In tests we don't actually need to track directory creation
      // since we're mocking the filesystem
    }
  )

  const mockSymlink = mock(async (target: string, path: string) => {
    files.set(path, { type: 'symlink', target })
  })

  const mockUnlink = mock(async (path: string) => {
    files.delete(path)
  })

  const mockExists = mock(async (path: string) => {
    return files.has(path)
  })

  const mocks: MockFs = {
    stat: mockStat,
    readdir: mockReaddir,
    mkdir: mockMkdir,
    symlink: mockSymlink,
    unlink: mockUnlink,
    exists: mockExists,
  }

  return {
    mocks,
    files,
    // Helper to add files during test setup
    addFile: (path: string, file: VirtualFile) => files.set(path, file),
    // Helper to check symlinks created
    getSymlinks: () =>
      [...files.entries()]
        .filter(([_, v]) => v.type === 'symlink')
        .map(([path, v]) => ({ path, target: v.target })),
  }
}
