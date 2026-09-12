## 1. What the view shows, decided free of the editor

- [x] 1.1 Add `clients/vscode/src/variableWatch.ts`, importing no `vscode`: the
      states the view can be in (no machine held, reading, variables, a machine
      that cannot report them, a server that refuses for a played machine), what
      each is shown as, and what an answer or a refusal does to the state.
- [x] 1.2 Give it the single-flight rule: a read is never begun while one is
      outstanding. Every outcome settles on a state of its own and is shown,
      rather than a failure leaving the last good answer up — a machine that has
      gone would otherwise go on showing what it last held.
- [x] 1.3 Recognise the played-machine refusal by what the server says rather than
      by a code, the way `declaredMachine` already recognises the machineless
      lint refusal, and turn it into its own state.

## 2. The view itself

- [x] 2.1 Add `clients/vscode/src/variableWatchView.ts`: the tree data provider
      and the view, a row per variable with its value beside the name and its
      kind in the tooltip.
- [x] 2.2 Read on a timer only while a play channel is open, and stop the timer
      when the view is not visible.
- [x] 2.3 Register it from `clients/vscode/src/extension.ts` beside the status item
      and the debug registration, and let it go on deactivation.

## 3. Telling the view where the program got to

- [x] 3.1 Add one member to `DebugHost` in `clients/vscode/src/machineDebug.ts`
      for the session to report that the program moved, keeping that module free
      of `vscode`.
- [x] 3.2 Call it from `#arrive`, which every stop passes through, and where the
      session finishes, so the view stops reading a machine that has gone.
- [x] 3.3 Implement it in `clients/vscode/src/machineDebugAdapter.ts` where the
      host is built.

## 4. Knowing when a machine is being played

- [x] 4.1 Have `clients/vscode/src/machinePanel.ts` say whether a play channel is
      open on the machine this window holds, and expose the connection the view
      reads through — the one connection the panel and the debug session already
      share.
- [x] 4.2 Make sure it says no while a debug session is mirroring, since asking to
      watch ends the playing.

## 5. The manifest

- [x] 5.1 Contribute the view to the panel container in
      `clients/vscode/package.json`, with a title that is a short noun phrase in
      sentence case.
- [x] 5.2 Add a `viewsWelcome` entry for a window holding no machine, saying what
      to do rather than showing an empty table.
- [x] 5.3 Add the view's activation event.
- [ ] 5.4 Move `basically.server.version` to the release carrying the server
      change. NOT DONE: no release carries it yet — it is on a branch in the
      `basically` repository. The pin stays at 0.1.16, which refuses a read of a
      played machine, and the view says so. This is the last thing to do before
      this change ships.

## 6. Tests

- [x] 6.1 Add `clients/vscode/test/variableWatch.test.mjs`, driving the compiled
      `out/variableWatch.js` over no editor and no server, in the manner of
      `test/machineStatus.test.mjs`: every state, the single-flight rule, and the
      refusal being recognised as its own state rather than a failure.
- [x] 6.2 Extend `clients/vscode/test/handshake.test.mjs` so what a real server
      answers for a played machine is checked against the client. It allows
      either of the two answers a server may give — answered, or refused for the
      machine being played — because the client is pinned to one server and can
      be pointed at any toolchain a user installs. Tighten it to the answer alone
      when 5.4 is done.
- [x] 6.3 Confirm `clients/vscode/test/machineDebug.test.mjs` still passes: a new
      `DebugHost` member changes neither the declared capabilities nor the
      answered requests, so its two-way check should be untouched.
- [x] 6.4 Confirm `clients/vscode/test/package.test.mjs` still passes with the new
      modules, which it resolves from inside the package.

## 7. Say what it does

- [x] 7.1 Say in the VS Code client's README what the view shows and when it is
      reading, including that a played machine is read as it runs and that two
      readings may differ.
- [x] 7.2 The Vim and Notepad++ clients need no follow-up: neither has a surface
      a table could live in. Say so where the change records its scope.

## 8. Gates

- [x] 8.1 `npm run lint && npm run build && npm run server && npm test`, in that
      order, because the tests import the compiled output and read the fetched
      server's manifest.
- [x] 8.2 `npm run package`, because the manifest changed.
- [x] 8.3 Drive the client against a toolchain checkout carrying the server change
      until a release has it:
      `BASICALLY_SERVER_PATH=/path/to/basically/scripts/basically npm test`.
- [ ] 8.4 By hand in the editor: run a counting listing and watch the table
      follow it; debug the same listing and watch it refresh at each stop; open a
      listing for a machine that cannot report variables and see it say so. NOT
      DONE: this needs a running VS Code, which the environment this was built in
      has none of. What was confirmed instead: the toolchain answers a played
      machine's variables twice over, with the count differing between the two
      readings, and says plainly that a machine which cannot report them cannot.
