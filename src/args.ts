import { homedir } from 'node:os'
import { parseArgs } from 'node:util'

export const args = parseArgs({
  allowPositionals: true,
  options: {
    dryRun: {
      type: 'boolean',
      short: 'd',
      description: 'Perform a trial run with no changes made',
      default: false,
    },
    target: {
      type: 'string',
      short: 't',
      description: 'Specify the target directory for the operation',
      default: homedir(),
      required: false,
    },
    silent: {
      type: 'boolean',
      description: 'Suppress non-essential output',
      default: false,
    },
    unlink: {
      type: 'boolean',
      description: 'Remove existing symlinks instead of creating them',
      default: false,
    },
    help: {
      type: 'boolean',
      short: 'h',
      description: 'Show help information',
      default: false,
    }
  },
  args: process.argv.slice(2),
})
