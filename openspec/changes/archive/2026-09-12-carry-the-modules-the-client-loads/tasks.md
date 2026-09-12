## 1. Make the failure visible first

The check comes before the fix. A check written after a fix has never been seen
to fail, and this one exists precisely because nothing failed for the release
that shipped broken.

- [x] 1.1 Add a package-against-itself suite beside the client-against-server
      one, taking the file list from the packager's own collector so that what is
      checked is what will ship. It needs no editor, no server and no network.
- [x] 1.2 Assert the entry point the manifest names is carried.
- [x] 1.3 Assert the entry point loads with nothing but the package: stand the
      shipped files up where nothing is resolvable above them, and walk every
      module asked for, transitively, with the runtime's own resolver. Assert
      each resolves, and resolves from inside the package.
- [x] 1.4 Run it and confirm 1.3 fails, naming the module and the file that asked
      for it. A pass here means the check is standing the package up somewhere
      that can still see the workspace's modules, and is worthless.
      — it failed as it had to: `out/extension.js loads
      "vscode-languageclient/node" and the package carries nothing that resolves
      it`, and the licence assertion with `the package carries no modules at
      all`.

## 2. Carry the modules

- [x] 2.1 Add a build step that copies the modules the client loads beside the
      compiled client, from the tree this repository's own install produced.
      Never fetch: what ships must be what the tests ran against.
      — `scripts/vendor-modules.mjs`.
- [x] 2.2 Work out what to carry from the client's declared dependencies,
      following only runtime dependencies, and resolve each name by walking
      module directories upward from the package that asks for it the way the
      runtime does — not from the top of the tree, where the same names exist at
      other versions, and not through the resolver, which throws on a package
      that does not expose its own manifest.
- [x] 2.3 Carry a module wanted at two versions underneath the package that wants
      it, rather than flattening. Two of them are already nested today, so this
      is load-bearing on the first run and not provision for later.
      — the walk takes `minimatch@5.1.9` and `brace-expansion@2.1.4` from under
      the language client, not the `minimatch@3.1.5` the tooling has at the top.
- [x] 2.4 Leave out type declarations and source maps; keep everything else, the
      licence files included.
      — 8 packages, 202 files, 1.6 MB on disk and 1.07 MB packed.
- [x] 2.5 Fail, naming what to run, where a declared dependency is not in the
      installed tree; where a carried module's own entry point is missing
      afterwards; or where a carried module brought no licence.
- [x] 2.6 Leave an already-correct set alone, as preparing the server does.

## 3. Wire it in where it closes the divergence

- [x] 3.1 Run the step as part of compiling the client, not only as part of
      packaging it — so the compiled output is self-sufficient, the suite can
      check it before packaging, and the client under the editor's debugger loads
      the copy that ships.
- [x] 3.2 Order the watch task so the step runs before the compiler is left
      watching, and confirm a rebuild does not remove what was carried.
- [x] 3.3 Leave the packaging command as it is. It already declines to assemble a
      dependency tree of its own, which is now correct rather than the cause:
      letting it try resolves to this repository's root and would carry the
      repository.
- [x] 3.4 Confirm type-checking is unaffected, and that the compiler does not
      descend into what was carried.

## 4. Finish the check

- [x] 4.1 Confirm 1.3 now passes.
- [x] 4.2 Assert a licence is carried for every module carried.
- [x] 4.3 Assert the server and its licence are carried, and the emulator with
      them, skipping where the suite was pointed at a toolchain checkout instead.
- [x] 4.4 Assert no source, test, source map or build configuration is carried —
      a guarantee the specification has always made and nothing has ever looked
      at.

## 5. Remove the trap in the ignore file

- [x] 5.1 Delete the re-inclusion of type declarations from the compiled output.
      It matches nothing today and would match every carried module's
      declarations the moment the step stopped filtering them.
- [x] 5.2 Say in the ignore file why there are two accounts of modules: the one
      the packager never looks inside, and the one the client loads.

## 6. Say what changed

- [x] 6.1 `CLAUDE.md`: the new build step and the new suite in the architecture
      table, and a convention that the extension carries the modules it loads —
      with the reason a package that cannot load reports every command as not
      found.
- [x] 6.2 The VS Code client's README: what a released client carries is now the
      server and what the client loads. The root README gains how and why, and
      the licence section gains the carried modules' own terms.

## 7. Quality gates

Run in this order; the tests import the compiled client and read the fetched
server, so building and fetching come first.

- [x] 7.1 `npm run lint`
- [x] 7.2 `npm run build`
- [x] 7.3 `npm run server` — carried `@ba.sical.ly/cli@0.1.15`, which is what
      `basically.server.version` currently resolves to.
- [x] 7.4 `npm test` — 21 checks, 20 passing, 1 skipped, none failing. Four were
      failing when this change began, neither of them caused by it, and both
      causes were in the suite rather than in the client; they are fixed here
      because a suite that cannot go green cannot hold anything up. See
      section 8.
- [x] 7.5 `npm run package`, required because what ships changes. 402 files,
      2.84 MB, with `out/node_modules/` (202 files, 1.07 MB) in it. Every module
      the entry point loads — 131 files — resolves from inside the unpacked
      `.vsix`, with none escaping it.
- [x] 7.6 Install the built package over the broken one and confirm by hand what
      no suite can. Installed as 0.2.0 and driven headlessly through the
      installed copy's *own* compiled resolution: it starts its own
      `server/dist/cli.mjs` under `node`, colours a `#MACHINE zx81` listing in 7
      runs (`macro`, `label`, `keyword`, `string`, `number`), answers a hover on
      `GOTO`, and lists the 26 machines the quick pick offers — the exact call
      `basically.selectMachine` makes. The editor's own window needs reloading
      before it picks up the new version; the palette command itself is the one
      thing that has to be clicked to be seen.
- [x] 7.7 No Vim client check applies: nothing here touches `clients/vim/`, which
      is not packaged by npm and loads no module. Should any task come to touch
      it, name the manual check that was run here.

## 8. Two faults in the suite itself, found by running it

Neither is this change's, and neither is in the client. They are fixed here
because the gate in 7.4 cannot mean anything while they stand.

- [x] 8.1 Three machine checks ran a listing ending `20 END` on whichever
      machine the carried server says it can run first — which is the ZX81, and
      the ZX81 has no `END`. The server was right to reject it: `Line must start
      with a statement keyword`. Confirmed the same rejection against
      `@ba.sical.ly/cli@0.1.6`, the version pinned before, so it was never about
      which server was carried.
- [x] 8.2 There is no terminator that works everywhere — `END` is not a
      statement on the ZX81 or the ZX80, and `STOP` is not one on the Apple I or
      the Apple II, checked across all 25 machines this copy can run. So the
      listing now prints and runs out, which all 25 accept, and says in a
      comment why it has no ending. Left as a helper rather than four strings,
      because the next person to add a machine test would otherwise write `END`
      again.
- [x] 8.3 `is the version the manifest pins` compared the carried version
      against the pin with `assert.equal`, which a range can never satisfy. It
      now holds the comparison where the pin names one version, and where it
      names a range says so and skips — naming the range and the version that
      was actually carried, because that is the one part of a run that is not
      reproducible. It does still insist the carried server states a concrete
      version.
- [x] 8.4 Confirm the suite no longer takes 90 seconds and then gets killed.
      The three failing machine checks were leaving machines running; it now
      finishes in under four seconds.
