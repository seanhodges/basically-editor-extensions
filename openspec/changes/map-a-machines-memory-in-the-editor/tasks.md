## 1. Asking the toolchain for a map

- [ ] 1.1 Add the map operation to the operations conversation, beside the one
      that asks for the play address: the address, whether one was already open,
      and why there is none when there is none.
- [ ] 1.2 Classify what comes back the way the variables watch classifies a
      refusal - by what the toolchain said, not by an error code - so a server
      that projects no map, a machine with no described layout and a window
      holding no machine are three states rather than one failure.

## 2. What the user is shown

- [ ] 2.1 A module free of the `vscode` module deciding what the user is told
      for each answer, in the manner of the machine status item and the
      variables watch: a state for every case, and one sentence for each.
- [ ] 2.2 Single-flight asking, so a second request while one is outstanding is
      skipped rather than queued behind it.
- [ ] 2.3 Name only settings the client actually contributes in anything the
      user is told to do about a remedy.

## 3. The view

- [ ] 3.1 Register a view that frames the address, with a content policy naming
      that origin and nothing else and nothing of the client's own inside the
      frame - the panel's discipline, applied to the second address.
- [ ] 3.2 Resolve the address for the editor's outer window, so the map works
      from a remote workspace for the same reason the panel does.
- [ ] 3.3 Ask the panel for the conversation it already holds, never for one to
      be started; show the nothing-yet state and let the editor draw its own
      welcome when there is no machine.
- [ ] 3.4 Pace it as the variables view is paced: a background tab is nobody
      looking.
- [ ] 3.5 Widen what a debug session reports its movement through, so more than
      one view can be told, without the session learning about either.

## 4. The manifest

- [ ] 4.1 Contribute the view, its welcome text, and the activation event that
      goes with it.
- [ ] 4.2 No new setting. Record here that this was decided rather than
      forgotten.

## 5. The server it is checked against

- [ ] 5.1 Move `basically.server.version` to the release carrying
      `watch-a-machines-memory`. Until one exists this stays where it is, and
      the view says the server projects no map - which is the behaviour this
      change specifies for that case, not a gap in it.
- [ ] 5.2 Drive the whole view against a toolchain checkout with
      `BASICALLY_SERVER_PATH`, and say in the run what was checked that way.

## 6. Tests

- [ ] 6.1 A client-against-itself check over no server at all: every state says
      something, none of them renders as an empty frame, and the three refusals
      are told apart.
- [ ] 6.2 Extend the client-against-server check to ask a real server for a map
      and accept either answer while the pin lags, in the manner of the check
      for a played machine's variables.
- [ ] 6.3 Check the manifest contributions from the test, as the existing
      contributions are checked.

## 7. Documentation

- [ ] 7.1 The READMEs: what the map shows, when it is reading, and - in the
      client's own words, not by reference to the panel's - what holding its
      address admits.
- [ ] 7.2 CLAUDE.md's architecture table gains the modules this adds.

## 8. Quality gates

- [ ] 8.1 `npm run lint`
- [ ] 8.2 `npm run build`
- [ ] 8.3 `npm run server` (needs npm registry access; say so rather than
      reporting a green run where it is unavailable)
- [ ] 8.4 `npm test`
- [ ] 8.5 `npm run package` - the manifest changes, so what ships changes
- [ ] 8.6 By hand in the editor: run a listing, dock the map, watch it follow the
      program; then debug one and step it. The Vim client is untouched and needs
      no check.
