## 1. Ask the toolchain to build

- [x] 1.1 Add `BuiltFile` and `BuildOutcome` to `clients/vscode/src/operations.ts`,
      naming only what this client asks for, in the voice of the report types
      already there.
- [x] 1.2 Add the `build` wrapper beside `run` and `info`, taking the machine, the
      source, the name the first file is to be written under, and the chosen
      target.
- [x] 1.3 Name `buildTargets` on `MachineFacts`. The server already reports them
      under `info`; this client has never asked for them.

## 2. Decide what is to be done, apart from the editor

- [x] 2.1 Add `clients/vscode/src/programTransfer.ts`, importing no `vscode`, in
      the manner of `machineStatus.ts`.
- [x] 2.2 Plan an export from the machines the server has, the listing's own
      declaration and the configured machine — the order `planRun` uses, but not
      refusing on whether the machine can be run, since building reads no ROM.
- [x] 2.3 Turn a `BuildOutcome` into what the user is told: a fatal problem means
      nothing was written and why; otherwise every file and where it went.

## 3. Do the editor's part

- [x] 3.1 Add `clients/vscode/src/programTransferCommands.ts`: the command, and
      one operations conversation of its own that holds no machine — resolved
      from configuration per question and dropped on any error that is not a
      refusal, as `machineStatusItem.ts` does.
- [x] 3.2 The command: settle the machine, ask `info` for the machine's targets,
      offer them, seed a save dialog from the listing's name and the target's
      extension, and call `build` with the buffer's text.
- [x] 3.3 Write the files: the first where the user said, the rest beside it
      under their own names, and say what was written where.
- [x] 3.4 Register it in `extension.ts` alongside the existing three, and dispose
      the conversation on deactivate.

## 4. Offer it twice

- [x] 4.1 Contribute the command in `clients/vscode/package.json`, category
      `Basically`, titled as a short imperative phrase in sentence case with no
      trailing period, with a `commandPalette` entry bound to a BASIC listing.
- [x] 4.2 Give it and the existing run command a codicon icon.
- [x] 4.3 Add the `editor/title` navigation entries — run, then export — both
      bound to a BASIC listing. This is the manifest's first toolbar.

## 5. Check it

- [x] 5.1 Add `clients/vscode/test/programTransfer.test.mjs`, client-against-itself
      over no server, in the manner of `machineStatus.test.mjs`: what the user is
      told for a fatal build, for one file, for several, and for a listing whose
      machine cannot be settled; and that a machine that cannot be run is still
      one that can be exported to.
- [x] 5.2 In the same suite, cross-check the manifest against itself as
      `machineDebug.test.mjs` does: every command a menu names is a command the
      manifest contributes, and every command carrying an icon appears in a menu
      that can draw one.
- [x] 5.3 Extend `clients/vscode/test/handshake.test.mjs`, inside the block that
      holds a machine of the editor's own: build a listing that declares its
      machine against the real server, and assert the target chosen, that a file
      came back, and that its stated size is the size of its bytes.

## 6. Say what it does

- [x] 6.1 Add a section to `clients/vscode/README.md` covering the command, the
      formats being the server's, and where the files go.

## 7. Quality gates

- [x] 7.1 `npm install`
- [x] 7.2 `npm run lint`
- [x] 7.3 `npm run build`
- [x] 7.4 `npm run server` — needs npm registry access; where it is unavailable,
      say so rather than reporting a green run.
- [x] 7.5 `npm test`
- [x] 7.6 `npm run package` — required: the manifest gains a command and a menu.
- [ ] 7.7 By hand in the editor: the two buttons appear on a listing and nowhere
      else, their tooltips read as the commands' titles, a narrow editor moves
      what does not fit into the overflow menu, and an exported file loads.
      The Vim client is untouched, so no manual check is owed there.
