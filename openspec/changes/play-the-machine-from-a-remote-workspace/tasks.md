## 1. Confirm it, changing nothing

Nothing is changed until a remote workspace has been seen. Each arrangement is
recorded as carried, or as not carried and why, because they differ in where the
window runs and in how the editor serves the mapping. Run the client as it
stands, on a listing for a machine the server being used can run.

- [ ] 1.1 A workspace over SSH — extension on the remote, window local: run a
      listing and record whether the panel shows the machine.
- [ ] 1.2 A container workspace: the same, recorded the same way.
- [ ] 1.3 A tunnel, and the editor in a browser: the same, recorded the same way.
      This is the arrangement most likely to differ — the frame is then inside a
      page rather than inside an application — so record what its content rules
      had to say, as `play-the-machine-in-the-editor` recorded them for the local
      case.
- [ ] 1.4 In every arrangement the panel showed a machine in, confirm keys reach
      it, and record any chord that did not arrive.
- [ ] 1.5 Where an arrangement did not carry, record which of the three it failed
      at — the address reaching the window, the origin the panel's content rules
      name, or the keys — and whether the fix is the client's, the editor's or
      the toolchain's. A fix that is the toolchain's stops this change until the
      `basically` repository serves it.

## 2. Carry the address

Only what section 1 showed to be wrong. A confirmation that found nothing leaves
this section empty and says so here.

- [ ] 2.1 Put right what stands between the address the toolchain gives back and
      a machine the window can show, keeping the panel a frame pointed at that
      address with nothing of ours added to what crosses it.
- [ ] 2.2 Keep the local case working, confirming it by hand again after any
      change to how the address is carried or to the panel's content rules.

## 3. Say what is not carried

- [ ] 3.1 Where an arrangement cannot be carried, say so in the panel with what
      would work instead, in the same voice the panel already uses to say why a
      listing cannot be run. Where every arrangement carried, this is not needed
      and is recorded as such.

## 4. Documentation

- [ ] 4.1 Say in the VS Code client's README what a remote user can expect of the
      panel, naming the arrangements confirmed in section 1 — and any that are
      not carried, with what to do instead. Do not weaken what the README already
      says about what holding the panel's address admits.
- [ ] 4.2 Where section 1 found a chord that does not arrive remotely but does
      locally, name it there; otherwise leave the README's rule as it stands.

## 5. Quality gates

Run in this order — the tests import the compiled output and read the fetched
server's manifest, so building and fetching come first.

- [ ] 5.1 `npm run lint`
- [ ] 5.2 `npm run build`
- [ ] 5.3 `npm run server` — needs npm registry access. Where it is unavailable,
      say so rather than reporting a green run.
- [ ] 5.4 `npm test`
- [ ] 5.5 `npm run package`, only where the manifest, `.vscodeignore` or anything
      about what ships changed. A change that only confirms and documents does
      not need it; say which it was.
- [ ] 5.6 No Vim client check applies: nothing here touches `clients/vim/`, which
      has no surface a machine could be shown in. Should any task come to touch
      it, name the manual check that was run here.
