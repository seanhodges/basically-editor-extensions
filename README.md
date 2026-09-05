# basically-editor-extensions

Monorepo of editor clients for the **Basically** language server. The server
itself (`lsp-server`) lives in a separate core repository; everything here is a
thin client that starts it and speaks LSP over stdio.

## Layout

```
.github/workflows/
  build-extensions.yml     # PRs, manual runs, and repository_dispatch from the core repo
  release-extensions.yml   # tag-triggered publish + GitHub Release
clients/
  vscode/                  # TypeScript extension using vscode-languageclient
  vim/                     # Vimscript shim for vim-lsp / Neovim vim.lsp
  notepadpp/               # Integration notes (PythonScript / NppLSP / C++ DLL)
package.json               # npm workspaces root
```

`clients/*` is an npm workspace glob. Only `clients/vscode` has a
`package.json`, so it is the only workspace npm actually installs; the Vim and
Notepad++ clients live in the same tree for release coordination but are not npm
packages.

## Architecture

One server, many clients. Each client's only jobs are: find the `lsp-server`
binary, spawn it, and hand its stdio to an LSP transport.

```
       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
       │  VS Code     │   │ Vim/Neovim   │   │ Notepad++    │
       │  extension   │   │  plugin      │   │  plugin      │
       └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
              └─────── LSP over stdio ──────────────┘
                              │
                     ┌────────▼────────┐
                     │   lsp-server    │  (core repo, released separately)
                     └─────────────────┘
```

### How the server binary is resolved

The binary is **never committed**. `executables/` is git-ignored everywhere.
Clients look for it in this order:

1. **Explicit setting** — `basically.server.path` (VS Code),
   `g:basically_lsp_cmd` (Vim/Neovim).
2. **Bundled copy** — `<client>/executables/lsp-server` (`.exe` on Windows),
   downloaded by CI at package time and shipped inside the `.vsix`.
3. **PATH** — the bare name `lsp-server`, for users who installed the server
   themselves.

CI populates step 2 during `build-extensions.yml` / `release-extensions.yml`.
When the core repo cuts a release it fires a `repository_dispatch` with
`event_type: lsp-server-updated` and a `client_payload.server_version`, which
this repo uses to pick the matching binary.

## Local development

```sh
npm install          # installs the vscode workspace
npm run build        # tsc across workspaces
npm run lint         # type-check across workspaces
npm run package      # produces dist/basically-vscode.vsix
```

### VS Code client

```sh
npm run --workspace basically-vscode watch
```

Then open `clients/vscode` in VS Code and press <kbd>F5</kbd> to launch an
Extension Development Host. Open a `.bas` file to trigger the
`onLanguage:basically` activation event.

Point the client at a locally built server rather than waiting on CI:

```jsonc
// .vscode/settings.json in the development host window
{
  "basically.server.path": "/absolute/path/to/lsp-server",
  "basically.trace.server": "verbose"
}
```

Server traffic shows up in *Output → Basically Language Server*.

To test the packaged artifact end to end:

```sh
npm run package
code --install-extension dist/basically-vscode.vsix
```

### Vim / Neovim client

Add `clients/vim` to your runtimepath — see
[`clients/vim/README.md`](clients/vim/README.md) for plugin-manager snippets.
For a throwaway check without touching your config:

```sh
vim -u NONE -c 'set rtp+=clients/vim' -c 'runtime plugin/my_lsp.vim' file.bas
```

The plugin exits early if `lsp-server` is not executable, so make sure it is on
`PATH` or set `g:basically_lsp_cmd` first.

### Notepad++ client

No build yet. See [`clients/notepadpp/README.md`](clients/notepadpp/README.md)
for the three candidate integration routes and the recommended starting point.

## Releasing

Push a `v*` tag. `release-extensions.yml` builds and packages every client,
attaches the `.vsix` files to a GitHub Release, and — once `VSCE_PAT` /
`OVSX_PAT` secrets are configured — publishes to the VS Code Marketplace and
Open VSX.

## License

MIT
