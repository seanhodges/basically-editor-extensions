# Basically — Vim / Neovim client

A thin Vimscript shim that registers the Basically language server with
whichever LSP host is present:

- **Neovim** (0.8+) built-in `vim.lsp`, through `nvim-lspconfig` when installed
- **Vim** with [`prabirshrestha/vim-lsp`](https://github.com/prabirshrestha/vim-lsp)

The plugin does nothing if neither host is available, or if the toolchain is
not installed.

## Requirements

The Basically toolchain, from npm:

```sh
npm install -g @ba.sical.ly/cli
```

That gives you `basically`, and the language server is one of its operations —
`basically lsp --stdio`. It is a Node program (22 or newer), not a binary, and
there is nothing else to download. No ROM is needed: the language server never
runs a program.

## Install

This directory is a standard runtimepath plugin: `plugin/basically.vim` is
sourced automatically. Plugin managers need the _subdirectory_ `clients/vim` of
this repository, not the repository root.

### vim-plug

```vim
Plug 'seanhodges/basically-editor-extensions', { 'rtp': 'clients/vim' }
```

### lazy.nvim

```lua
{
  'seanhodges/basically-editor-extensions',
  ft = { 'basically' },
  config = function(plugin)
    vim.opt.rtp:append(plugin.dir .. '/clients/vim')
    vim.cmd.runtime('plugin/basically.vim')
  end,
}
```

### packer.nvim

```lua
use { 'seanhodges/basically-editor-extensions', rtp = 'clients/vim' }
```

### Manual

```sh
git clone https://github.com/seanhodges/basically-editor-extensions.git
# Vim
ln -s "$PWD/basically-editor-extensions/clients/vim" ~/.vim/pack/basically/start/basically
# Neovim
ln -s "$PWD/basically-editor-extensions/clients/vim" ~/.local/share/nvim/site/pack/basically/start/basically
```

## Configuration

Set these **before** the plugin loads (e.g. early in `vimrc` / `init.lua`):

| Variable                                                          | Purpose                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| `g:basically_cmd`<br>default `['basically', 'lsp', '--stdio']`     | How to start the server                                 |
| `g:basically_machine`<br>default `''`                              | The machine listings default to                         |
| `g:basically_enabled`<br>default `1`                               | Set to `0` to skip registration entirely                |

```vim
let g:basically_cmd = ['/opt/node/bin/basically', 'lsp', '--stdio']
let g:basically_machine = 'zx81'
```

## Telling it which machine

Every listing is for one machine, and the server needs to know which before it
can help. It takes the first of these that answers:

1. A `#MACHINE zx81` line at the top of the listing — always wins, so one
   repository can hold programs for several machines.
2. `g:basically_machine`, which this plugin passes both as the workspace
   setting the server pulls and as an initialization option, since clients
   differ in which they support.
3. What the listing's own text can be worked out to be — and where several
   machines would read it equally, the server says so rather than guessing.

When none of the three settles it, you get one problem reported on the listing
saying what to set.

## Colour

Colour comes from the server, as semantic tokens. Most of the kinds it reports
map to highlight groups your colourscheme already has. Two do not, because
nothing outside a BASIC listing needs them — a line number, and a graphics
character:

```lua
vim.api.nvim_set_hl(0, '@lsp.type.label.basically', { link = 'Label' })
vim.api.nvim_set_hl(0, '@lsp.type.atom.basically', { link = 'Character' })
```

Without those two lines everything else is still coloured; those runs are just
left plain.

## Troubleshooting

```vim
:echo executable(g:basically_cmd[0])  " must be 1
:LspStatus                            " vim-lsp
:checkhealth vim.lsp                  " Neovim
```

If the server does not start, run `basically lsp --stdio` in a terminal: it
should sit there holding the connection open rather than printing something and
exiting.
