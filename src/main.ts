#!/usr/bin/env bun
import { exists } from 'node:fs/promises'
import { join } from 'node:path'
import { args } from './args'
import { AutoLink } from './auto-link'
import { COLORS } from './utils'
import { AutoLinkResult } from './enums'

export interface StowedOptions {
  dryRun?: boolean
  silent?: boolean
  unlink?: boolean
}

const HELP_TEXT = `Usage: stowed [options] <paths...>

Create or remove symlinks for specified paths in a target directory.

Examples:
  ${COLORS.Italic}Create symlinks in the home directory${COLORS.Reset}
  ${COLORS.Gray}$ stowed nvim/.config/nvim lazygit/.config/lazygit${COLORS.Reset}

  ${COLORS.Italic}Dry-run creating symlinks without making changes${COLORS.Reset}
  ${COLORS.Gray}$ stowed -d nvim/.config/nvim${COLORS.Reset}

  ${COLORS.Italic}Create symlinks in a custom target directory${COLORS.Reset}
  ${COLORS.Gray}$ stowed -t /custom/dir nvim/.config/nvim${COLORS.Reset}


Options:
  --target, -t <dir>    Target directory where links will be created (defaults to os.homedir())
  --dryRun, -d          Simulate the linking process without making changes
  --silent              Suppress output messages
  --unlink              Remove existing links instead of creating them
  -h, --help            Show this help message
`

async function main() {
  if (args.values.help || args.positionals.length === 0) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  const opts: StowedOptions = args.values

  const rootDir = process.cwd()

  const targetDir = args.values.target

  for (const path of args.positionals) {
    if (!(await exists(path))) {
      console.error(`${COLORS.Red}Path does not exist: ${path}`)
      process.exit(1)
    }
  }

  const links = args.positionals.map(positional => {
    const realPath = join(rootDir, positional)

    const [_pkg, ...rest] = positional.split('/').filter(Boolean)
    const relativePath = rest.join('/')

    const linkPath = join(targetDir, relativePath)

    return new AutoLink(realPath, linkPath, opts)
  })

  const result: { success: AutoLink[]; error: AutoLink[] } = {
    success: [],
    error: [],
  }

  for (const link of links) {
    try {
      await link.apply()
      if(link.result === AutoLinkResult.Failed) {
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
