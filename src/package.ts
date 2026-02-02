import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { AutoLink } from './auto-link'
import type { StowedOptions } from './main'

/**
 * Represents a stow package directory.
 * Handles discovery of symlink targets using a recursive algorithm that:
 * 1. Symlinks files directly
 * 2. Symlinks directories that match the package name (package owns this subtree)
 * 3. Symlinks directories that contain files (leaf directories)
 * 4. Recurses into directories that only contain subdirectories (containers)
 */
export class Package {
  readonly name: string
  readonly path: string

  constructor(
    input: string,
    private readonly rootDir: string
  ) {
    // Normalize: strip ./ prefix and trailing /
    const normalized = input.replace(/^\.\//, '').replace(/\/$/, '')

    // Package name is the first path segment
    const name = normalized.split('/')[0]
    if (!name) {
      throw new Error(`Invalid package path: ${input}`)
    }
    this.name = name
    this.path = join(rootDir, this.name)
  }

  /**
   * Discover all symlinks that should be created for this package.
   */
  async discoverLinks(
    targetDir: string,
    opts?: StowedOptions
  ): Promise<AutoLink[]> {
    return this.discover(this.path, targetDir, '', opts)
  }

  private async discover(
    currentPath: string,
    targetDir: string,
    relativePath: string,
    opts?: StowedOptions
  ): Promise<AutoLink[]> {
    const links: AutoLink[] = []
    const children = await readdir(currentPath)

    for (const child of children) {
      const childPath = join(currentPath, child)
      const childRelPath = relativePath ? join(relativePath, child) : child
      const stats = await stat(childPath)

      if (stats.isFile()) {
        // Files are always symlinked directly
        const linkPath = join(targetDir, childRelPath)
        links.push(new AutoLink(childPath, linkPath, opts))
      } else if (stats.isDirectory()) {
        if (child === this.name) {
          // Package owns this subtree - symlink the whole directory
          const linkPath = join(targetDir, childRelPath)
          links.push(new AutoLink(childPath, linkPath, opts))
        } else if (await this.containsFiles(childPath)) {
          // Reached a "leaf" directory - symlink it
          const linkPath = join(targetDir, childRelPath)
          links.push(new AutoLink(childPath, linkPath, opts))
        } else {
          // Container directory with only subdirs - recurse deeper
          const subLinks = await this.discover(
            childPath,
            targetDir,
            childRelPath,
            opts
          )
          links.push(...subLinks)
        }
      }
    }

    return links
  }

  /**
   * Check if a directory contains any files (not just subdirectories).
   */
  private async containsFiles(dirPath: string): Promise<boolean> {
    const children = await readdir(dirPath)

    for (const child of children) {
      const childPath = join(dirPath, child)
      const stats = await stat(childPath)
      if (stats.isFile()) {
        return true
      }
    }

    return false
  }
}
