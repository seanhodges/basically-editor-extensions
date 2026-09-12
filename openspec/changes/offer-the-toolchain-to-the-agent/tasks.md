## 1. The environment a launch needs

- [x] 1.1 Add `envOverlayFor` to the server module, returning what a launch adds
  to an environment and nothing else, and reduce `envFor` to spreading it over
  the process environment; verify `npm run lint` passes and the language client
  and the operations conversation still start unchanged.

## 2. The ROM agreement, asked in one place

- [x] 2.1 Move the question and the recording of the answer out of the panel into
  a module of their own, taking a phrase naming what wants the images and
  returning whether the user agreed; verify the module compiles and holds no
  reference to the panel.
- [ ] 2.2 Reduce the panel's own asking to a call of it, keeping the panel's
  three-part message on a decline; verify by hand that running a listing on a
  machine needing images still asks, still opens the terms, and still says what a
  decline means.

## 3. Offering the toolchain

- [x] 3.1 Add the module that describes the server to the editor: the provider,
  the description derived from the launch, the version derived from what will
  actually run, and the event fired when a setting bearing on it changes; verify
  `npm run lint` passes.
- [ ] 3.2 Ask for the ROM agreement before the editor starts the server, and
  return the description either way; verify a decline still leaves the toolchain
  offered.
- [ ] 3.3 Register it during activation, beside the status item and the debug
  registration; verify the extension still activates with the language server
  stopped.

## 4. Serving on the first listing

- [ ] 4.1 Start the language client when the first listing is open rather than on
  activation, guarded so a burst of opened documents starts one server; verify by
  hand that a window with no listing starts no server and that opening one starts
  it.
- [ ] 4.2 Leave restarting the server unconditional; verify the existing scenario
  by hand — installing the toolchain and restarting serves from the new one.

## 5. The manifest

- [x] 5.1 Raise the editor version the extension asks for, and the types with it;
  verify `npm run lint` passes and `npm run package` still produces a `.vsix`.
- [ ] 5.2 Contribute the provider and the setting that says whether the toolchain
  is offered; verify the setting appears in the editor's settings and that
  turning it off removes the server from the editor's list without a restart.

## 6. Checking the client against the server

- [x] 6.1 Add a client for the agent's protocol beside the language server's,
  reading messages framed by line rather than by length; verify it drives a
  conversation with the server the extension would start.
- [x] 6.2 Extend the client-against-server suite with the agent's conversation:
  the server answers, offers tools, and carries out a request needing no machine
  and no images; verify `npm test` passes.
- [x] 6.3 Extend the same suite with what the client owes itself: the overlay for
  each kind of launch, and the provider named in the manifest being the one the
  client registers; verify `npm test` passes.

## 7. Saying so

- [x] 7.1 Update the VS Code client's README with what an agent can now be given
  and the setting that governs it, and add the setting to its table; verify the
  table names every setting the manifest contributes.
- [x] 7.2 Update the root README and `CLAUDE.md`, which describe the client as
  holding two conversations with the toolchain and now hold three; verify every
  module named in the architecture table exists.

## 8. The gates

- [x] 8.1 `npm run lint && npm run build && npm run server && npm test`, in that
  order; a failing run leaves this unchecked with a note on what failed.
- [x] 8.2 `npm run package` — the manifest changes, so what ships changes.
- [x] 8.3 `npx openspec validate --specs`.
- [ ] 8.4 `BASICALLY_SERVER_PATH=<toolchain checkout>/scripts/basically npm test`,
  checking this client against a toolchain that is not the pinned release.
- [ ] 8.5 The hand checks: no server in a window with no listing; the toolchain
  listed among the editor's servers and its tools enumerated; the ROM agreement
  asked once and then not again; turning the setting off; pointing at a checkout
  and finding the agent served from it. Name what was run.

### What the gates reported

`npm run lint && npm run build && npm run server && npm test` is green: 72
tests, 0 failures, against the pinned `@ba.sical.ly/cli@0.1.16`. `npm run
package` produces the `.vsix` (409 files, 2.87 MB) with the new modules and the
server's `LICENSE` in it. `npx openspec validate --specs` passes all seven
capabilities, and this change validates.

8.4 is unchecked because it failed, on an assertion this change does not touch:
*"says which machines it cannot run, before anything is attempted"* expects at
least one machine to report that it has no ROM, and a toolchain checkout holds
every image under `public/roms/`, so every machine reports as runnable. The same
failure occurs with this file as it stood before this change, so it is a fact
about running the suite against a checkout rather than a client and a server
that have parted company. Everything else in that run passed, including the
agent's conversation.

The agent's own check was confirmed not to be vacuous: naming the operation
wrongly fails both of its assertions.
