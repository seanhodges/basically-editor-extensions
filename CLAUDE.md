# CLAUDE.md

## What this is

**basically-editor-extensions** holds the editor clients for the **Basically**
language server — the same language help the [Basically IDE](https://ba.sical.ly)
gives in the browser, in whatever editor someone keeps their BASIC listings in.
Problems as you type, completion of the machine's own keywords, hover,
jump-to-definition, the outline, a variable's uses and colour, for the machine
each listing is written for.

**The server is not built here.** It is `basically lsp --stdio`, an operation of
the Basically toolchain published to npm as `@ba.sical.ly/cli`, and it lives in
the [`basically`](https://github.com/seanhodges/basically) repository. Every
client here does the same two things: start that command, and speak LSP over its
stdio. The language features are all the server's — a change that needs the
server to answer something new is a change in `basically`, not here.

**Clients:** `clients/vscode/` (TypeScript, `vscode-languageclient`),
`clients/vim/` (Vimscript shim with embedded Lua, for Neovim's built-in LSP or
Vim + `vim-lsp`), `clients/notepadpp/` (integration notes only — no build yet).
`clients/*` is an npm workspace glob, but only `clients/vscode` is an npm
package; the others live here for release coordination.

**Stack:** TypeScript (strict), npm workspaces, Node's own test runner. Node 22.
GPL-3.0-or-later, matching the toolchain.

## Spec-driven changes (OpenSpec)

New features and behaviour changes go through
[OpenSpec](https://github.com/Fission-AI/OpenSpec) (a devDependency; invoke as
`npx openspec …`): `/opsx:explore` to think a change through, `/opsx:propose` to
create the change folder with proposal/design/spec-delta/tasks artifacts,
`/opsx:apply` to implement, `/opsx:archive` to merge the spec deltas into the
baseline once shipped.

- Baseline capability specs (what a client guarantees, behaviourally) live in
  `openspec/specs/<capability>/spec.md`; in-flight changes in
  `openspec/changes/`. Validate with `npx openspec validate --specs`.
- Project conventions the artifacts must respect are in `openspec/config.yaml`
  (`context:`, per-artifact `rules:`).
- Specs say **what a client guarantees**; the READMEs and this file say **how**.
  Describe the language help as the server's — a client guarantees that it
  starts the right server, with a runtime that can run it, having told it which
  machine the listing is for.
- Scenarios use **exactly four hashes** (`#### Scenario:`). Three fails silently
  and the requirement is read as having none, which `validate` is the only thing
  that catches.
- A change with no behaviour change (refactor, tooling, docs) gets no spec
  delta; set `skip_specs: true` in its `.openspec.yaml` and say why.
- Never hand-edit the generated `.claude/commands/opsx/` and
  `.claude/skills/openspec-*/` files — `npx openspec update` regenerates them.

## Commands

```bash
npm install          # installs the vscode workspace and the tooling
npm run lint         # type-check across workspaces (tsc --noEmit)
npm run build        # tsc across workspaces → clients/vscode/out/, with the
                     # modules the client loads carried beside it
npm run server       # fetch the pinned language server into clients/vscode/server/
npm test             # drive a real LSP conversation with it
npm run package      # → dist/basically-vscode.vsix
npm run clean        # remove out/ and server/

npm run --workspace basically-vscode watch   # then F5 in clients/vscode
```

**Run them in that order.** The tests import the *compiled* `out/server.js` — so
they resolve the server the way the shipped extension does, not the way the test
imagines it would — and they read `clients/vscode/server/package.json` to check
the pin. `package.test.mjs` goes further and asks the packager itself what it
will ship, which is the compiled output and the modules carried beside it.
Building and fetching therefore come before testing, which is why CI runs
`lint → build → server → test → package`.

**Before finishing a change**, run `npm run lint && npm run build && npm run
server && npm test`, plus `npm run package` when the manifest, `.vscodeignore`
or anything about what ships changes. Fetching the server needs npm registry
access; where it is unavailable, say so rather than reporting a green run.

`npm test` is the check that matters here. It starts the server the extension
would start and holds a real `Content-Length`-framed conversation with it:
capabilities, a diagnostic on a listing that declares its machine, a hover, and
the message the server publishes when it cannot tell which machine a listing is
for. It needs no editor, and it is what catches a client and a server that have
parted company.

To check against a toolchain checkout rather than the pinned release — the way
to try a server that is not published yet:

```sh
BASICALLY_SERVER_PATH=/path/to/basically/scripts/basically npm test
```

The Vim client has no automated coverage. Check it by hand and say what you ran:

```sh
vim -u NONE -c 'set rtp+=clients/vim' -c 'runtime plugin/basically.vim' file.bas
```

## Architecture

| Path                                   | Role                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `clients/vscode/src/extension.ts`       | Activation, the two commands, and the `LanguageClient` wiring                     |
| `clients/vscode/src/server.ts`          | Where the server is and what runs it — kept free of `vscode` so a plain Node test can drive it |
| `clients/vscode/src/framing.ts`         | `Content-Length`-framed JSON, driven by both the extension and the tests         |
| `clients/vscode/src/operations.ts`      | The toolchain's operations conversation, and which machine a listing runs on — also free of `vscode` |
| `clients/vscode/src/machinePanel.ts`    | The panel, and the frame pointed at the address the toolchain gives back        |
| `clients/vscode/src/roms.ts`            | Asking the toolchain what images are held, and recording the user's agreement   |
| `clients/vscode/package.json`           | The extension manifest, and the **one place** the server version is pinned        |
| `clients/vscode/test/handshake.test.mjs`| The client-against-server check, over a hand-rolled LSP client in `lspClient.mjs` |
| `clients/vscode/test/package.test.mjs`  | The package-against-itself check: every module the entry point loads, resolved from inside the package |
| `clients/vim/plugin/basically.vim`      | Registration with whichever LSP host is present                                   |
| `scripts/fetch-server.mjs`              | Puts the pinned server inside the VS Code client at build time                    |
| `scripts/vendor-modules.mjs`            | Puts the modules the compiled client loads beside it, at the versions the lockfile resolved |
| `openspec/specs/`                       | What the clients guarantee, per capability                                        |

**Three precedence chains are this repo's real subject**, and each is stated in
`openspec/specs/` as well as in the READMEs:

- **Which machine** a listing is for: its own `#MACHINE` declaration, then what
  the user configured, then what it can be inferred to be — declining to guess
  where several machines read it equally.
- **Which server** to start: what the user configured, the copy that shipped
  with the client, then `basically` on `PATH`.
- **Which runtime** runs it: what the user configured, `node` on `PATH`, then
  the editor's own. First new enough wins.

Serving the language and running a machine ask different things of a server, and
the second is the narrower: **whether a machine can be run is always asked of
the server that was found**, never decided from anything a client holds.

## Conventions

- **The server is pinned in one place** — `basically.server.version` in
  `clients/vscode/package.json`. The build, the tests and the release all read
  it from there. Bumping it there is the whole of bumping the server.
- **`clients/*/server/` is git-ignored and never committed.** It is filled by
  `scripts/fetch-server.mjs`, which `npm pack`s the pinned version and unpacks
  the package's own files only — never its dependency tree, which exists for
  building and presenting and comes to most of half a gigabyte. The emulator the
  toolchain reaches for is unpacked the same way beside it, at the version the
  toolchain's own manifest asks for: the toolchain resolves it before it runs
  anything, so a copy without it runs no machine at all. **No ROM image is ever
  fetched, committed or published by the build** — a machine needing one is run
  only after the user has agreed, through the toolchain's own `roms accept`.
- **Never refuse to start over a version number.** Where no new-enough Node is
  available, serve with the best there is and say so in the output channel.
  Refusing leaves the user with a working editor and no language help at all.
- **Every semantic token type the server advertises needs a scope in the
  manifest**, or those runs are silently uncoloured and nothing tells the user
  why. `handshake.test.mjs` checks this against the live server's legend.
- **A setting named in a server diagnostic must be one a client contributes**,
  or the user is told to set something that does not exist. Also checked there.
- **The packaged `.vsix` carries a GPL program and must ship its `LICENSE`.**
  A server that unpacks without `dist/cli.mjs` or without `LICENSE` fails the
  build rather than reaching a user.
- **The extension carries the modules it loads**, in `out/node_modules/`, put
  there by `scripts/vendor-modules.mjs` at the versions the lockfile resolved —
  so the copy that ships is the copy that was tested, and the client under the
  debugger loads it too. `clients/*` is a workspace glob, so what the client
  requires is hoisted to the repository root and is no part of the package; and
  the packager never looks inside a workspace's own top-level `node_modules`
  either, which is why they go beside the compiled client rather than above it.
  A package whose entry point cannot be loaded from inside it, or a carried
  module without its licence, fails the build: **an extension whose main module
  will not load runs no activation**, so it registers none of its commands and
  the editor answers every one of them as not found, having offered it from the
  manifest a moment earlier. `package.test.mjs` is what checks this.
- **Strict TypeScript** — `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns` and `noFallthroughCasesInSwitch` are on.
- **No Prettier, no ESLint.** `npm run lint` is `tsc --noEmit`. Match the
  surrounding style: 2-space, single quotes, semicolons, trailing commas.
- **Comments** say what the code does and why, in the present tense. Multi-line
  prose is for facts the code cannot express — why the editor's runtime needs
  telling to be Node, why configuration synchronisation is load-bearing, why a
  guard is lifted to the job in a workflow. Everything else gets one line. Never
  name a planning artifact or an OpenSpec change in a comment; git records what
  moved and when.
- **UI labels** — a command's title says what running it does, as a short
  imperative phrase in sentence case with no trailing period: "Choose the
  machine to check against", not "Machine". A setting's description says what
  setting it changes and what happens when it is left empty.
