" basically.vim - register the Basically language server with Vim or Neovim.
"
" The server is the Basically toolchain, installed from npm:
"
"   npm install -g @ba.sical.ly/cli
"
" It is a Node program rather than a binary, and it is started as an operation
" of the `basically` command - there is nothing else to download.
"
" Supported hosts:
"   * Neovim built-in LSP (vim.lsp), via nvim-lspconfig when available
"   * Vim + prabirshrestha/vim-lsp
"
" Configuration (set before this plugin loads):
"   let g:basically_cmd     = ['basically', 'lsp', '--stdio']
"   let g:basically_machine = 'zx81'   " default machine; a listing's own
"                                      " #MACHINE line always wins
"   let g:basically_enabled = 0        " skip registration entirely

if exists('g:loaded_basically')
  finish
endif
let g:loaded_basically = 1

if get(g:, 'basically_enabled', 1) == 0
  finish
endif

if !exists('g:basically_cmd')
  let g:basically_cmd = ['basically', 'lsp', '--stdio']
endif

if !exists('g:basically_machine')
  let g:basically_machine = ''
endif

" Only register when the toolchain is actually reachable.
if !executable(g:basically_cmd[0])
  finish
endif

" *.bas is the Basically source format. setfiletype does not override a
" filetype something else already set, so another BASIC plugin keeps its own.
augroup basically_filetype
  autocmd!
  autocmd BufRead,BufNewFile *.bas setfiletype basically
augroup END

if has('nvim-0.8') && luaeval('vim.lsp ~= nil')
  " --- Neovim built-in LSP ---------------------------------------------------
lua << LUAEOF
local cmd = vim.g.basically_cmd
local machine = vim.g.basically_machine ~= '' and vim.g.basically_machine or nil
-- The machine reaches the server two ways because clients differ in which they
-- support: `settings` is what it pulls, `init_options` what it is handed at
-- startup. A listing's own #MACHINE line takes precedence over both.
local settings = { basically = { machine = machine } }
local init_options = { machine = machine }

-- A listing needs no project around it, so a lone file is served from its own
-- directory rather than not at all.
local function root_of(fname)
  local git = vim.fs.find('.git', { upward = true, path = fname })[1]
  return git and vim.fs.dirname(git) or vim.fs.dirname(fname)
end

local ok, lspconfig = pcall(require, 'lspconfig')
if ok then
  local configs = require('lspconfig.configs')
  if not configs.basically then
    configs.basically = {
      default_config = {
        cmd = cmd,
        filetypes = { 'basically' },
        root_dir = root_of,
        settings = settings,
        init_options = init_options,
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
        root_dir = root_of(vim.api.nvim_buf_get_name(args.buf)),
        settings = settings,
        init_options = init_options,
      }, { bufnr = args.buf })
    end,
  })
end
LUAEOF
elseif exists('*lsp#register_server')
  " --- Vim + vim-lsp ---------------------------------------------------------
  let s:workspace_config = {}
  let s:initialization_options = {}
  if g:basically_machine !=# ''
    let s:workspace_config = {'basically': {'machine': g:basically_machine}}
    let s:initialization_options = {'machine': g:basically_machine}
  endif
  augroup basically_register
    autocmd!
    autocmd User lsp_setup call lsp#register_server({
          \ 'name': 'basically',
          \ 'cmd': {server_info->g:basically_cmd},
          \ 'allowlist': ['basically'],
          \ 'workspace_config': s:workspace_config,
          \ 'initialization_options': s:initialization_options,
          \ })
  augroup END
endif
