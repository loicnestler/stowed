# stowed

A simple, zero-dependencies symlink manager for your dotfiles.

> I only started this project because there was no easy way of installing GNU Stow with traditional cross-platform package managers such as [Mise-en-Place](https://mise.jdx.dev/) (which uses [Aqua](https://aquaproj.github.io/))

## Installation

```bash
bun install -g stowed@latest
```

or

```bash
bunx stowed@latest
```

## Usage

```bash
stowed [options] <paths...>
```

The tool expects paths in the format `package/path/to/file`. It strips the first directory (the "package" name) and creates a symlink at the target location.

For example, `stowed nvim/.config/nvim` creates a symlink at `~/.config/nvim` pointing to `nvim/.config/nvim` in your current directory.

### Options

| Flag | Description |
|------|-------------|
| `-t, --target <dir>` | Target directory (defaults to home) |
| `-d, --dryRun` | Preview changes without applying them |
| `--silent` | Suppress "nothing to do" messages |
| `--unlink` | Remove symlinks instead of creating them |
| `-h, --help` | Show help |

### Examples

```bash
# Link your nvim and lazygit configs
stowed nvim/.config/nvim lazygit/.config/lazygit

# Preview what would happen
stowed -d nvim/.config/nvim

# Link to a custom directory
stowed -t /custom/dir nvim/.config/nvim

# Remove existing symlinks
stowed --unlink nvim/.config/nvim
```

## Similar tools
- [GNU Stow](https://www.gnu.org/software/stow/)

## License

MIT

