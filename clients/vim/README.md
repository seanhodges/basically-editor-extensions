# Basically — Vim / Neovim client

A thin Vimscript shim that registers the Basically language server with whichever
LSP host is present:

- **Neovim** (0.8+) built-in `vim.lsp`, through `nvim-lspconfig` when installed
- **Vim** with [`prabirshrestha/vim-lsp`](https://github.com/prabirshrestha/vim-lsp)

The plugin does nothing if neither host is available, or if the `lsp-server`
binary is not on `PATH`.

## Requirements

The `lsp-server` binary (`lsp-server.exe` on Windows) must be reachable — either
on `PATH`, or pointed at explicitly via `g:basically_lsp_cmd`.

## Install

This directory is a standard runtimepath plugin: `plugin/my_lsp.vim` is sourced
automatically. Plugin managers need the *subdirectory* `clients/vim` of this
repository, not the repository root.

### vim-plug

```vim
Plug 'basically/basically-editor-extensions', { 'rtp': 'clients/vim' }
```

### lazy.nvim

```lua
{
  'basically/basically-editor-extensions',
  ft = { 'basically' },
  config = function(plugin)
    vim.opt.rtp:append(plugin.dir .. '/clients/vim')
    vim.cmd.runtime('plugin/my_lsp.vim')
  end,
}
```

### packer.nvim

```lua
use { 'basically/basically-editor-extensions', rtp = 'clients/vim' }
```

### Manual

```sh
git clone https://github.com/basically/basically-editor-extensions.git
# Vim
ln -s "$PWD/basically-editor-extensions/clients/vim" ~/.vim/pack/basically/start/basically
# Neovim
ln -s "$PWD/basically-editor-extensions/clients/vim" ~/.local/share/nvim/site/pack/basically/start/basically
```

## Configuration

Set these **before** the plugin loads (e.g. early in `vimrc` / `init.lua`):

| Variable                  | Default                          | Purpose                                   |
| ------------------------- | -------------------------------- | ----------------------------------------- |
| `g:basically_lsp_cmd`     | `lsp-server` / `lsp-server.exe`  | Path to the language server binary        |
| `g:basically_lsp_args`    | `[]`                             | Extra CLI arguments for the server         |
| `g:basically_lsp_enabled` | `1`                              | Set to `0` to skip registration entirely  |

```vim
let g:basically_lsp_cmd = expand('~/.local/bin/lsp-server')
let g:basically_lsp_args = ['--log-level=debug']
```

## Troubleshooting

```vim
:echo executable(g:basically_lsp_cmd)  " must be 1
:LspStatus                             " vim-lsp
:checkhealth vim.lsp                   " Neovim
```
