## 1. Asking the toolchain for a map

- [x] 1.1 Add the map operation to the operations conversation, beside the one
      that asks for the play address: the address, whether one was already open,
      and why there is none when there is none.
- [x] 1.2 Classify what comes back the way the variables watch classifies a
      refusal - by what the toolchain said, not by an error code - so a server
      that projects no map, a machine with no described layout and a window
      holding no machine are three states rather than one failure.

## 2. What the user is shown

- [x] 2.1 A module free of the `vscode` module deciding what the user is told
      for each answer, in the manner of the machine status item and the
      variables watch: a state for every case, and one sentence for each.
- [x] 2.2 Single-flight asking, so a second request while one is outstanding is
      skipped rather than queued behind it.
- [x] 2.3 Name only settings the client actually contributes in anything the
      user is told to do about a remedy.

## 3. The view

- [x] 3.1 Register a view that frames the address, with a content policy naming
      that origin and nothing else and nothing of the client's own inside the
      frame - the panel's discipline, applied to the second address.
- [x] 3.2 Resolve the address for the editor's outer window, so the map works
      from a remote workspace for the same reason the panel does.
- [x] 3.3 Ask the panel for the conversation it already holds, never for one to
      be started; show the nothing-yet state when there is no machine. Said by
      the view rather than by the editor's own welcome, for the reason recorded
      under 4.1 - with the same offer to run a listing the welcome would have
      made.
- [x] 3.4 Pace it as the variables view is paced: a background tab is nobody
      looking.
- [x] 3.5 Widen what a debug session reports its movement through, so more than
      one view can be told, without the session learning about either.

## 4. The manifest

- [x] 4.1 Contribute the view and the activation event that goes with it. No
      welcome text: welcome content is drawn for tree views only, and the map
      has to be a webview to frame an address, so what a window holding no
      machine is told is the view's own page - with the same offer to run a
      listing the editor's welcome would have made.
- [x] 4.2 No new setting. Decided, not forgotten: how often a map is read is the
      toolchain's business and where the user docks it is the editor's, so there
      is nothing left for a setting to decide.

## 5. The server it is checked against

- [x] 5.1 Moved to 0.1.19, which is the release carrying
      `watch-a-machines-memory`; 0.1.18 has no such operation.
- [x] 5.2 Driven against a toolchain checkout as well as against the pin, and
      against the real map both ways: an address is given, something answers at
      it, asking again gives back the same address as one already open, and the
      play channel onto the same machine is untouched.

## 6. Tests

- [x] 6.1 A client-against-itself check over no server at all: every state says
      something, none of them renders as an empty frame, and the three refusals
      are told apart.
- [x] 6.2 Extend the client-against-server check to ask a real server for a map
      and accept either answer while the pin lags, in the manner of the check
      for a played machine's variables.
- [x] 6.3 Check the manifest contributions from the test, as the existing
      contributions are checked.

## 7. Documentation

- [x] 7.1 The READMEs: what the map shows, when it is reading, and - in the
      client's own words, not by reference to the panel's - what holding its
      address admits.
- [x] 7.2 CLAUDE.md's architecture table gains the modules this adds.

## 8. Quality gates

- [x] 8.1 `npm run lint`
- [x] 8.2 `npm run build`
- [x] 8.3 `npm run server` (needs npm registry access; say so rather than
      reporting a green run where it is unavailable)
- [x] 8.4 `npm test`
- [x] 8.5 `npm run package` - the manifest changes, so what ships changes
- [ ] 8.6 By hand in the editor: run a listing, dock the map, watch it follow the
      program; then debug one and step it. The Vim client is untouched and needs
      no check. Not done: there is no editor in the environment this was
      implemented in. Everything reachable without one is covered by 5.2, 6.1
      and 6.2 - including the real map, fetched at the address the view frames.
