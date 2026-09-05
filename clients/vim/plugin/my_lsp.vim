" my_lsp.vim - register the Basically language server with Vim or Neovim.
"
" Supported hosts:
"   * Neovim built-in LSP (vim.lsp), via nvim-lspconfig when available
"   * Vim + prabirshrestha/vim-lsp
"
" Configuration (set before this plugin loads):
"   let g:basically_lsp_cmd  = '/path/to/lsp-server'   " default: 'lsp-server'
"   let g:basically_lsp_args = []                      " extra CLI arguments
"   let g:basically_lsp_enabled = 0                    " disable registration

if exists('g:loaded_basically_lsp')
  finish
endif
let g:loaded_basically_lsp = 1

if get(g:, 'basically_lsp_enabled', 1) == 0
  finish
endif

if !exists('g:basically_lsp_cmd')
  let g:basically_lsp_cmd = has('win32') ? 'lsp-server.exe' : 'lsp-server'
endif

if !exists('g:basically_lsp_args')
  let g:basically_lsp_args = []
endif

" Only register when the binary is actually reachable.
if !executable(g:basically_lsp_cmd)
  finish
endif

let s:cmd = [g:basically_lsp_cmd] + g:basically_lsp_args
" Exposed globally so the Lua block below can read it.
let g:basically_lsp_cmd_list = s:cmd

" Treat *.bas / *.basically as the 'basically' filetype.
augroup basically_lsp_filetype
  autocmd!
  autocmd BufRead,BufNewFile *.bas,*.basically setfiletype basically
augroup END

if has('nvim-0.8') && luaeval('vim.lsp ~= nil')
  " --- Neovim built-in LSP ---------------------------------------------------
lua << EOF
local cmd = vim.g.basically_lsp_cmd_list
local root_markers = { '.git', 'basically.toml' }

local ok, lspconfig = pcall(require, 'lspconfig')
if ok then
  local configs = require('lspconfig.configs')
  if not configs.basically then
    configs.basically = {
      default_config = {
        cmd = cmd,
        filetypes = { 'basically' },
        root_dir = lspconfig.util.root_pattern(unpack(root_markers)),
        settings = {},
      },
    }
  end
  lspconfig.basically.setup({})
else
  -- No nvim-lspconfig: attach directly on filetype.
  vim.api.nvim_create_autocmd('FileType', {
    pattern = 'basically',
    callback = function(args)
      vim.lsp.start({
        name = 'basically',
        cmd = cmd,
        root_dir = vim.fs.dirname(vim.fs.find(root_markers, { upward = true })[1]),
      }, { bufnr = args.buf })
    end,
  })
end
EOF
elseif exists('*lsp#register_server')
  " --- Vim + vim-lsp ---------------------------------------------------------
  augroup basically_lsp_register
    autocmd!
    autocmd User lsp_setup call lsp#register_server({
          \ 'name': 'basically',
          \ 'cmd': {server_info->s:cmd},
          \ 'allowlist': ['basically'],
          \ })
  augroup END
endif
