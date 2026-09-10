# basically-editor-extensions

Editor clients for the **Basically** language server — the same language help
the [Basically IDE](https://ba.sical.ly) gives in the browser, in whatever
editor you keep your BASIC listings in.

Problems as you type, completion of the machine's own keywords, hover, jumping
from a `GOSUB` to the line it calls, the program's outline, every use of a
variable, and colour — all of it for the machine each listing is written for,
whether that is a ZX81, a BBC Micro, a C64 or any other machine the toolchain
knows.

## The server

There is one server, and it is not built here. It is an operation of the
Basically toolchain, published to npm:

```sh
npm install -g @ba.sical.ly/cli
basically lsp --stdio
```

It is a **Node program** (22 or newer), not a platform binary. It boots no
emulator and reads no ROM, so it works the same on a machine with no ROMs at
all.

Every client here does the same two things: start that command, and speak LSP
over its stdio.

```
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  VS Code     │   │ Vim/Neovim   │   │ Notepad++    │
   │  extension   │   │  plugin      │   │  (notes)     │
   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
          └────────── LSP over stdio ───────────┘
                            │
              ┌─────────────▼──────────────┐
              │ basically lsp --stdio      │
              │ @ba.sical.ly/cli, from npm │
              └────────────────────────────┘
```

## Layout

```
.github/workflows/
  build-extensions.yml     # PRs, pushes to main, manual runs
  release-extensions.yml   # tag-triggered publish + GitHub Release
clients/
  vscode/                  # TypeScript extension using vscode-languageclient
  vim/                     # Vimscript shim for vim-lsp / Neovim vim.lsp
  notepadpp/               # Integration notes (PythonScript / LSP plugin / C++ DLL)
scripts/
  fetch-server.mjs         # puts the pinned server inside clients/vscode
openspec/                  # what each client guarantees, and changes in flight
package.json               # npm workspaces root
```

`clients/*` is an npm workspace glob. Only `clients/vscode` has a
`package.json`, so it is the only workspace npm installs; the Vim and Notepad++
clients live in the same tree for release coordination but are not npm packages.

### How the VS Code extension finds the server

`clients/vscode/server/` is **git-ignored and never committed**. It is filled at
build time by `scripts/fetch-server.mjs`, which `npm pack`s the pinned version
of `@ba.sical.ly/cli` and unpacks it there — the package's own files only, no
dependency tree. Its dependencies exist for _running_ machines and come to
roughly half a gigabyte; the language server reaches none of them, so the
bundled server is about 3 MB.

The version is pinned in exactly one place, `basically.server.version` in
`clients/vscode/package.json`. Bump it there and the build, the tests and the
release all follow.

At run time the extension resolves, in order:

1. **`basically.server.path`** — a `basically` command, or a checkout's
   `cli.mjs`. For working on the toolchain itself.
2. **The bundled copy** — `server/dist/cli.mjs` inside the extension.
3. **`basically` on `PATH`** — for someone who installed the toolchain
   themselves.

A bundled `cli.mjs` needs a Node to run it, chosen in order:
`basically.server.nodePath`, then `node` from `PATH`, then the editor's own
Node. The first one that is 22 or newer wins; where none is, the best available
is used anyway and the _Basically_ output channel says so, because refusing to
start over a version number would leave you with no language help at all.

## Local development

```sh
npm install          # installs the vscode workspace
npm run build        # tsc across workspaces
npm run lint         # type-check across workspaces
npm run server       # fetch the pinned language server
npm test             # drive a real LSP conversation with it
npm run package      # produces dist/basically-vscode.vsix
```

`npm test` is the check that matters here. It starts the server the extension
would start, and holds a real `Content-Length`-framed conversation with it:
capabilities, a diagnostic on a listing that declares its machine, a hover, and
the message the server publishes when it cannot tell which machine a listing is
for. It needs no editor, and it is what catches a client and a server that have
parted company.

To run those tests against a checkout of the toolchain rather than the pinned
release — the way to check a server that is not published yet:

```sh
BASICALLY_SERVER_PATH=/path/to/basically/scripts/basically npm test
```

### VS Code client

```sh
npm run --workspace basically-vscode watch
```

Then open `clients/vscode` in VS Code and press <kbd>F5</kbd> to launch an
Extension Development Host. Open a `.bas` file to trigger the
`onLanguage:basically` activation event.

Point the client at a locally built server rather than the bundled one:

```jsonc
// .vscode/settings.json in the development host window
{
  "basically.server.path": "/absolute/path/to/basically/scripts/basically",
  "basically.trace.server": "verbose",
}
```

Server traffic shows up in _Output → Basically_.

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
vim -u NONE -c 'set rtp+=clients/vim' -c 'runtime plugin/basically.vim' file.bas
```

The plugin exits early if `basically` is not executable, so install the
toolchain or set `g:basically_cmd` first.

### Notepad++ client

No build yet. See [`clients/notepadpp/README.md`](clients/notepadpp/README.md)
for the three candidate integration routes and the recommended starting point.

## Spec-driven changes

Features and behaviour changes go through
[OpenSpec](https://github.com/Fission-AI/OpenSpec). What each client guarantees
lives as a baseline capability spec in `openspec/specs/`, and in-flight work in
`openspec/changes/`; `npx openspec list --specs` and `npx openspec validate
--specs` are the CLI you need. Specs say **what a client guarantees** — that it
starts the right server, with a runtime that can run it, having told it which
machine the listing is for. The language help itself is the server's, and
belongs to the [`basically`](https://github.com/seanhodges/basically)
repository's specs, not to these.

## Telling it which machine

Every listing is for one machine, and the server needs to know which before it
can help with anything. It takes the first of these that answers:

1. **The listing declares it** — a `#MACHINE zx81` line at the top always wins,
   so one repository can hold programs for several machines.
2. **You configured one** — `basically.machine` in VS Code (the command
   **Basically: Choose the machine to check against** lists what this server
   has), `g:basically_machine` in Vim.
3. **It can be worked out** from the listing's own text — and where several
   machines would read it equally, the server says so rather than guessing.

When none of the three settles it, you get one problem reported on the listing
saying exactly what to set.

## Releasing

Push a `v*` tag. `release-extensions.yml` builds, fetches the pinned server,
runs the tests, packages every client, attaches the `.vsix` files to a GitHub
Release, and — where the `VSCE_PAT` / `OVSX_PAT` secrets are configured —
publishes to the VS Code Marketplace and Open VSX.

## Licence

GPL-3.0-or-later, matching the toolchain. The packaged `.vsix` contains a copy
of `@ba.sical.ly/cli`, which is GPL-3.0-or-later, with its own `LICENSE` beside
it.
