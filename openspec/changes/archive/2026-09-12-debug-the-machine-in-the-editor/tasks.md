## 1. Confirm what this rests on

Nothing below should be built out before these are settled; each would change the
shape of the work rather than a detail of it.

- [x] 1.1 Confirm a release of the toolchain serves the debugger — being told
      which lines to stop before, stepping, continuing, saying where a machine is
      and whether it can be stepped. Until one does, work against a checkout and
      say so.
      **It does.** `@ba.sical.ly/cli` 0.1.16 serves `break`, `step`, `continue`
      and `where`, takes lines to stop before with a run, and says of a machine
      whether it can be stepped. Everything below was built and checked against
      it, not against a checkout.
- [x] 1.2 Confirm the editor lets an inline debug adapter be registered and
      driven without an adapter process, on the earliest editor version the
      manifest claims to support.
      **It does.** `DebugAdapterInlineImplementation`, `DebugAdapter` and
      `registerDebugAdapterDescriptorFactory` are all long-settled API, present
      well before the 1.85 the manifest asks for. No process, no dependency.
- [x] 1.3 Confirm the editor's debug surface renders from what the adapter
      declares — that declining stepping in and out, setting a variable and
      conditional breakpoints actually removes those controls rather than leaving
      them to fail when used.
      **Only partly, and the difference matters.** Setting a variable, a
      condition or a hit count on a breakpoint, a logpoint, a data breakpoint, a
      restart and a disassembly are each gated on a declaration, and declining
      them removes the control. Stepping in and stepping out are not: the editor
      draws both for every stopped session whatever the adapter says. So both run
      the program on to its next BASIC line, which is what stepping means where
      there is nothing to step into — recorded as a decision in `design.md` and
      as a requirement in the `machine-debug` delta.
- [x] 1.4 Confirm which chords the editor keeps for itself while a debug session
      is under way, so the console is reachable and the session's own controls are
      not shadowed.
      **Nothing is shadowed.** The client contributes no keybindings at all, so
      the editor keeps every chord a debug session uses — starting and
      continuing, stepping, stopping, and opening the debug console that keys are
      sent from. The chords a played machine does not get are the panel's
      subject and are unchanged.

## 2. Asking what can be debugged

- [x] 2.1 Ask the resolved server whether the listing's machine can be run and
      whether it can be stepped, before offering to debug, and hold neither
      answer in the client.
- [x] 2.2 Tell the three reasons apart — no machine settled, a machine this
      server cannot run, a machine that cannot be stepped — and say the remedy
      for each, naming only settings the client contributes.
- [x] 2.3 Offer running the listing where its machine can be run but not stepped.

## 3. The adapter

- [x] 3.1 Register a debug adapter, implemented inside the extension and handed
      to the editor without an adapter process, against the type the manifest
      contributes.
- [x] 3.2 Declare in the handshake only going on to the next line and continuing,
      and decline setting a variable, conditional breakpoints, hit counts,
      logpoints, data breakpoints, restart and disassembly. Stepping in and out
      are not declinable — see 1.3 — so both run on to the next BASIC line
      rather than failing when used.
- [x] 3.3 Fill in a configuration for a user who has written none, so starting a
      session on the listing being edited needs nothing of them, while honouring
      one they have written.
- [x] 3.4 Start the session by running the listing on the screen, unsaved changes
      included, with the lines to stop before already in place, and report where
      it stopped.
- [x] 3.5 Hold the machine the panel holds — one per editor window — and let it go
      when the session ends.
- [x] 3.6 Keep the session and the language server independent, so restarting
      either leaves the other alone.

## 4. Breakpoints

- [x] 4.1 Map a row the user set a breakpoint on to the BASIC line number that row
      carries, and send those line numbers.
- [x] 4.2 Report a row carrying no BASIC line number back to the editor as a
      breakpoint that will not be hit, and never move it to another line to make
      it work.
- [x] 4.3 Send the changed set while a session is under way, so a breakpoint added
      at a stop is in force for the rest of it.

## 5. A stopped program

- [x] 5.1 Report a stopped program as one frame, labelled with the line it is
      stopped before and located in the document being debugged, so the editor
      highlights that line.
- [x] 5.2 Answer what is in scope with the program's variables as the server
      reports them, and say when a machine cannot report them rather than
      answering with none.
- [x] 5.3 Show the machine's screen through the toolchain's mirroring projection,
      carried to the editor's own surface the way the panel's is, and take no
      input at it.
- [x] 5.4 Step and continue on the editor's controls, refreshing where the program
      is and what it holds after each; end the session when the program ends,
      saying it ended.
- [x] 5.5 Answer a continue that ran its bound out without blocking the editor,
      and say the program is still going.

## 6. Keys, and the two ways to start a listing

- [x] 6.1 Send keys to a debugged program from the console, as the machine's own
      keys named the way a written schedule names them.
- [x] 6.2 Say how keys are sent at the moment a debugged program waits for input,
      rather than leaving the user pressing keys at a picture.
- [x] 6.3 End a play channel when a debug session starts on the same machine, and
      end a session when the listing is run without debugging, telling the user
      which happened either way.
- [x] 6.4 Close the two open questions this change leaves — whether a session may
      hand over to playing for input and back, and whether the mirrored screen
      shares the panel or has a surface of its own — and record the answers here
      before 5.3 and 6.1 are finished.
      **No handover.** The console is the only input path. A handover suspends
      every guarantee a session rests on, twice, at moments the user did not
      choose, and both proper ways out — a toolchain projection that mirrors and
      forwards keys, or a session that can be told to stand down and resume — are
      larger than this change and are not this client's to invent first.
      **The mirrored screen shares the panel**, captioned while it mirrors. One
      machine to a window means one screen to look at, and a played machine and a
      debugged one are never the same machine at once, so a second surface would
      show the same machine twice or a stale picture of one already let go.
      Both are written up in `design.md`, along with the third question that
      change left — starting a session on a listing whose machine cannot be
      settled refuses and says what to set, as the run command does.

## 7. The manifest, the READMEs and the pin

- [x] 7.1 Contribute the debug type, its configuration shape and the language it
      applies to, and nothing the adapter does not implement.
- [x] 7.2 Move the pinned server version to a release that serves the debugger, in
      the one place it is named.
      `basically.server.version` was `*`, which named a set rather than a
      release; it is now `0.1.16`, so what the suite ran against is what ships
      and the check that the carried server is the named one no longer stands
      down.
- [x] 7.3 Add debugging beside running in the client's README and the repo's,
      saying that the machine behind a session is mirrored and is sent keys by
      asking.

## 8. Tests

- [x] 8.1 Extend `clients/vscode/test/handshake.test.mjs`, which is where a client
      and a server are checked against each other: the server answers whether a
      machine can be stepped; a listing that declares its machine is run with
      lines to stop before and reports stopping at one; stepping reports the next
      line; the variables come back for a stopped program; and a machine that
      cannot be stepped is answered rather than failing.
- [x] 8.2 Check that every control the adapter declares is one the client
      implements, and every one it implements is declared — the same two-way check
      the token scopes already get, so the editor never offers a button that does
      nothing.
- [x] 8.3 Check the row-to-line mapping without an editor: a numbered row, a blank
      row, a row with no number, and a listing renumbered between two sessions.
- [x] 8.4 Check that the editor's machine and the command line's are held
      separately while both are debugging.

## 9. Quality gates

Run in this order; the tests import the compiled client and read the fetched
server, so building and fetching come first.

- [x] 9.1 `npm run lint`
- [x] 9.2 `npm run build`
- [x] 9.3 `npm run server` — needs npm registry access. Where it is unavailable,
      say so rather than reporting a green run. The registry was reachable and
      0.1.16 was fetched.
- [x] 9.4 `npm test`
- [x] 9.5 `npm run package`, required because the manifest gains a debug
      contribution and the pinned version moves.
- [x] 9.6 Confirm the suite ran against a server that actually serves the
      debugger — the pin moved by 7.2, or a checkout via
      `BASICALLY_SERVER_PATH=/path/to/basically/scripts/basically npm test`. A
      pass against a server without it has exercised none of this and must be
      reported that way.
      It did: against the pinned 0.1.16, a real program was stopped before a
      line, stepped on to the next, read for its variables and mirrored at an
      address that answered — and a machine that cannot be stepped refused the
      lines rather than accepting them. Each of those tests stands down loudly
      where the server can step nothing, so a pass is never empty in silence.
- [x] 9.7 No Vim client check applies: nothing here touches `clients/vim/`, which
      has no debug surface to wear. Should any task come to touch it, name the
      manual check that was run here. Nothing here touched it.
