# stowed

A simple symlink manager for your dotfiles. Similar to GNU Stow, but simpler.

> I started this project because there was no easy way of installing GNU Stow with cross-platform package managers like [Mise-en-Place](https://mise.jdx.dev/).

## Installation

```bash
bun install -g stowed@latest
```

or run directly:

```bash
bunx stowed@latest
```

## Usage

```bash
stowed [options] <packages...>
```

Run from your dotfiles directory. Each package is a subdirectory containing files/folders to symlink to your home directory.

### Options

| Flag | Description |
|------|-------------|
| `-t, --target <dir>` | Target directory (defaults to home) |
| `-d, --dryRun` | Preview changes without applying |
| `--silent` | Suppress "nothing to do" messages |
| `--unlink` | Remove symlinks instead of creating |
| `-h, --help` | Show help |

### Examples

```bash
# Stow multiple packages
stowed nvim ghostty zsh

# Preview what would happen
stowed -d nvim ghostty

# Stow to a custom directory
stowed -t /custom/dir nvim

# Remove symlinks
stowed --unlink nvim ghostty
```

## Directory Convention

stowed uses a simple convention to determine what to symlink. It traverses each package directory and:

1. **Files** are symlinked directly
2. **Directories matching the package name** are symlinked entirely
3. **Directories containing files** are symlinked entirely
4. **Directories containing only subdirectories** are traversed deeper

### Example Structure

```
dotfiles/
├── nvim/
│   └── .config/
│       └── nvim/           # Symlinked: ~/.config/nvim -> dotfiles/nvim/.config/nvim
│           ├── init.lua
│           └── lua/
├── git/
│   └── .gitconfig          # Symlinked: ~/.gitconfig -> dotfiles/git/.gitconfig
├── zsh/
│   └── .zshrc              # Symlinked: ~/.zshrc -> dotfiles/zsh/.zshrc
└── ghostty/
    └── .config/
        └── ghostty/        # Symlinked: ~/.config/ghostty -> dotfiles/ghostty/.config/ghostty
            └── config
```

Running `stowed nvim git zsh ghostty` from the `dotfiles/` directory creates:

| Source | Target |
|--------|--------|
| `nvim/.config/nvim` | `~/.config/nvim` |
| `git/.gitconfig` | `~/.gitconfig` |
| `zsh/.zshrc` | `~/.zshrc` |
| `ghostty/.config/ghostty` | `~/.config/ghostty` |

## Similar Tools

- [GNU Stow](https://www.gnu.org/software/stow/)

## License

MIT

