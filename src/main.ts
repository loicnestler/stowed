#!/usr/bin/env bun
import { exists } from 'node:fs/promises'
import { args } from './args'
import type { AutoLink } from './auto-link'
import { AutoLinkResult } from './enums'
import { Package } from './package'
import { COLORS } from './utils'

export interface StowedOptions {
  dryRun?: boolean
  silent?: boolean
  unlink?: boolean
}

const HELP_TEXT = `Usage: stowed [options] <packages...>

Create or remove symlinks for packages in a target directory.
Similar to GNU Stow, but simpler.

Examples:
  ${COLORS.Italic}Stow packages to home directory${COLORS.Reset}
  ${COLORS.Gray}$ stowed nvim ghostty zsh${COLORS.Reset}

  ${COLORS.Italic}Preview changes without applying${COLORS.Reset}
  ${COLORS.Gray}$ stowed -d nvim ghostty${COLORS.Reset}

  ${COLORS.Italic}Stow to a custom target directory${COLORS.Reset}
  ${COLORS.Gray}$ stowed -t /custom/dir nvim${COLORS.Reset}

  ${COLORS.Italic}Remove symlinks${COLORS.Reset}
  ${COLORS.Gray}$ stowed --unlink nvim ghostty${COLORS.Reset}

Options:
  -t, --target <dir>    Target directory (defaults to home directory)
  -d, --dryRun          Preview changes without applying
  --silent              Suppress "nothing to do" messages
  --unlink              Remove symlinks instead of creating them
  -h, --help            Show this help message

Directory Convention:
  Packages should follow this structure:
    <package>/.config/<package>/   -> ~/.config/<package>
    <package>/.<dotfile>           -> ~/.<dotfile>
`

async function main() {
  if (args.values.help || args.positionals.length === 0) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  const opts: StowedOptions = args.values
  const rootDir = process.cwd()
  const targetDir = args.values.target

  // Validate packages exist
  const packages: Package[] = []
  for (const input of args.positionals) {
    const pkg = new Package(input, rootDir)
    if (!(await exists(pkg.path))) {
      console.error(
        `${COLORS.Red}Package does not exist: ${pkg.name}${COLORS.Reset}`
      )
      process.exit(1)
    }
    packages.push(pkg)
  }

  // Discover all links from packages
  const links: AutoLink[] = []
  for (const pkg of packages) {
    const pkgLinks = await pkg.discoverLinks(targetDir, opts)
    links.push(...pkgLinks)
  }

  const result: { success: AutoLink[]; error: AutoLink[] } = {
    success: [],
    error: [],
  }

  for (const link of links) {
    try {
      await link.apply()
      if (link.result === AutoLinkResult.Failed) {
        result.error.push(link)
        continue
      }

      result.success.push(link)
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `${COLORS.Red}Failed to apply ${link.pretty}: ${error.message}`
        )
      } else {
        console.error(
          `${COLORS.Red}Failed to apply ${link.pretty}: Unknown error`
        )
      }

      result.error.push(link)
    }
  }

  if (result.error.length > 0) {
    console.log(`${COLORS.Red}Some links failed to apply.`)
    process.exit(1)
  }

  process.exit(0)
}

main()
