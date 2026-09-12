## Context

The client will already, once `play-the-machine-in-the-editor` lands, hold a
machine of its own: a second long-lived child of the same toolchain, resolved by
the same module that resolves the language server, speaking the operations
conversation over its streams, with a panel showing what comes back. This change
adds nothing to that arrangement. It asks the same machine different questions
and puts the answers where the editor already keeps them.

The READMEs describe the three precedence chains — which machine, which server,
which runtime — and `CLAUDE.md` the conventions; neither is restated here.

## Server contract: yes, it changes

The client cannot grow this capability alone. The toolchain must be able to be
told the BASIC lines a program is to stop before, to step a stopped program on to
its next line, to continue it until it stops again or ends, and to say where a
held machine is and whether it can be stepped at all. That is the `machine-debug`
capability of the toolchain, proposed in the `basically` repository as
`debug-a-program-outside-the-browser`, which also amends `headless-cli` so that
describing a machine says whether it can be stepped. Nothing designed here asks
the server for anything beyond it, and none of it can be implemented before a
release carries it.

## Goals / Non-Goals

**Goals:**

- Debugging a listing with the editor's own debug surface — its gutter, its
  stopped-line highlight, its variables pane, its step and continue — over the
  toolchain's answers.
- Not becoming a debugger. Every fact about where a program is and what it holds
  comes from the server; the client translates and displays.
- Nothing added to what ships: no new dependency, no separate adapter program.
- A machine that cannot be stepped, and a listing that cannot be run, met with a
  sentence and a remedy rather than a failure.

**Non-Goals:**

- A second way of reaching the toolchain. The conversation, the resolution and
  the held machine are the ones the panel change establishes.
- The Vim and Notepad++ clients, and everything else the proposal lists.

## Decisions

### The adapter lives inside the extension

**Decision.** The debug adapter is implemented in the extension host and handed
to the editor through `DebugAdapterInlineImplementation`, registered by a
`DebugAdapterDescriptorFactory` against the type the manifest contributes. No
adapter process is spawned and no debug-adapter library is added.

**Why.** The client's runtime dependencies are one, deliberately, and it is
packaged with `--no-dependencies`; a library whose job is to frame messages and
dispatch requests would be carrying a great deal to solve a problem the client
does not have, since the protocol reaches an inline adapter as objects rather
than as bytes on a pipe. The adapter is also the one part of this that must talk
to both the editor and the held machine, and inline is the only arrangement where
it can simply hold the same conversation the panel does rather than being handed
a copy of it.

**Alternatives considered.** *A separate adapter executable* — the conventional
shape, and it would need a second resolution chain, a second copy of the
operations client, and a way to share one machine across two processes, for
nothing gained. *A debug-adapter library inline* — smaller than the above and
still a dependency, licence pass and packaging change for message plumbing the
editor is already doing.

### One stack frame, named for the line the program stopped before

**Decision.** A stopped program is reported as a single frame, labelled with the
BASIC line it is stopped before and located in the document being debugged.
Asking for what is in scope answers with the program's variables, from the
operation that reads them.

**Why.** The protocol scopes variables to a frame, so a session with no frame has
nowhere to put them — the variables pane would be empty however well the client
answered. One frame is also the honest number: BASIC as these machines run it has
no call stack the toolchain can report, and inventing a `GOSUB` depth the server
does not know would be the client asserting something it cannot see. The frame's
line is what makes the editor highlight the stopped line, which is the whole of
what the user is looking for.

**Alternatives considered.** *No frames at all* — costs the variables pane and
the highlight, which is most of the feature. *A frame per `GOSUB`* — the machine
does not report one, so it would be guesswork rendered as fact.

### A breakpoint is a line number, and a row without one cannot hold it

**Decision.** The user sets a breakpoint on a row of the editor; the client reads
the BASIC line number that row carries and sends that. A row carrying no line
number is reported back to the editor as unverified, so the breakpoint is shown
as one that will not be hit rather than as one that silently never is.

**Why.** The machine stops before a BASIC line number, and rows and line numbers
are not the same thing: a listing can be renumbered without moving a row, a row
can be blank, and a row can be a continuation. Sending a row number would stop
the program somewhere unrelated, or nowhere. The editor has a way to say "this
breakpoint is not going to work", and it exists for exactly this.

**Alternatives considered.** *Refuse the breakpoint* — the editor keeps showing
it anyway, so the user is told nothing. *Snap to the nearest numbered row above*
— plausible and quietly wrong: a user who set a breakpoint on a blank line
between two routines would find the program stopping in the one above.

### The debug session's screen mirrors; playing drives

**Decision.** A debug session shows the machine through the toolchain's
mirroring projection. Running without debugging opens the driving one — the
panel `machine-panel` describes. A listing is started one way or the other, never
both at once, and the client says which happened when a request for one ends the
other.

**Why.** The toolchain's own guarantees force it and, once forced, fit: a machine
being driven by a person runs on its own clock, and requests that stop it or
measure it are refused while that is true. So a debug session cannot be held over
a driving channel without giving up breakpoints, stepping and the variables — the
whole session. The mirroring projection exists, in the toolchain's words, so that
a machine being driven by requests can be watched by someone who is not driving
it, which is precisely what a person watching their own debugged program is.

**Alternatives considered.** *One projection for both, driving* — costs the
session everything it is for. *No screen while debugging* — a program stopped
part-way through has drawn something, and hiding it makes the stopped line the
only evidence of anything.

### Keys reach a debugged program by being asked for

**Decision.** A program stopped or running under the debugger is sent keys
through the operation that drives a machine by a schedule, from the debug
console. The mirrored screen takes no input.

**Why.** It is the only input path that leaves the machine one that advances
only when something asked it to, which is what every measurement and every
breakpoint rests on. It also means a key sent by hand and the same key in a
written schedule reach the machine identically, which the toolchain already
guarantees. The cost is real and is the weakest joint in this design: a program
sitting at `INPUT` is answered by typing into a console rather than at the
screen, and the client must say so at that moment rather than leaving the user
pressing keys at a picture.

**Alternatives considered.** *Hand over to the driving channel while input is
needed and back afterwards* — what a user would most expect, and it suspends
every guarantee mid-session, twice, at moments the user did not choose; left as
an open question rather than a decision. *A third projection that mirrors and
forwards keys* — the right long-term answer and not this client's to invent: it
is a toolchain capability, and asking for one before this has been lived with
would be designing for a complaint nobody has made yet.

### The adapter declines what it cannot do, in the handshake

**Decision.** The adapter's answer to the editor's opening question claims
stepping over and continuing and nothing else: no stepping in or out, no setting
a variable, no conditional breakpoints, no hit counts, no logpoints, no data
breakpoints, no restart, no disassembly.

**Why.** The editor renders its debug toolbar and its context menus from that
answer, so anything claimed and unimplemented becomes a button that does nothing
— which is the same fault as a semantic token the manifest gives no scope, and
this repo already treats that as a fault in the client rather than a gap in the
server. Declining is also how the user learns what a BASIC debugger is, without
reading anything.

### Whether a machine can be stepped is asked, not carried

**Decision.** Before offering to debug, the client asks the server it resolved
whether that machine can be run and whether it can be stepped, and says which
answer stopped it when one does.

**Why.** The client already asks the server for the machines it has rather than
carrying a list, and the same reasoning applies twice over here: which machines
can be stepped is the toolchain's fact and changes with the toolchain, and the
server actually serving the user may not be the one the client shipped with —
the user may have pointed it at their own install. Carrying the answer would make
the client wrong on someone else's machine, silently.

### One machine per window, and a session that outlives a language-server restart

**Decision.** A debug session holds the machine the panel holds — one per editor
window — and releasing it is the session ending. Restarting the language server
does not disturb it, and neither does the session disturb the language server.

**Why.** They are two conversations with two child processes, and the only thing
they share is how the client found them. A user restarting the language server
because completion went quiet should not lose the program they had stopped on
line 100.

## Risks / Trade-offs

- **`INPUT` under the debugger is awkward and users will say so** → The console
  is the input path, and it is a worse experience than typing at the screen.
  Mitigated by saying it at the moment a program waits, rather than in
  documentation. Named as the first open question because the two ways out — a
  mid-session handover, or a new toolchain projection — are both larger than this
  change.
- **Nothing here can be tested until the toolchain ships its debugger** → Same
  shape as the panel change and the same mitigation: the override that points the
  suite at a toolchain checkout, and a run against a server without the debugger
  reported as having exercised none of this.
- **The stopped line depends on what the machine reports** → A machine whose line
  reporting lags its execution will highlight a line the user does not expect,
  and the client cannot tell. The toolchain owns that, and the same machine
  behaves the same way in the browser IDE; the client's part is not to paper over
  it with a guess.
- **Remote development** → Inherited from the panel change and unchanged: the
  mirrored screen is an address on the machine the server runs on, and the
  editor's external-URI mapping is what carries it. It remains the one assumption
  that would invalidate showing a screen at all, and it is confirmed in
  `play-the-machine-from-a-remote-workspace` rather than here or in the panel
  change, which guarantees a panel for one computer. Nothing here waits on it: a
  debugger that shows a screen where the panel shows one is right either way.
- **A third long-lived process is not added, but a second is now busier** → The
  held machine serves the panel and the session. A debug session that stops
  asking is a machine sitting still, which costs nothing; a continue that runs
  its bound out occupies the conversation for that long, and the client must not
  block the editor on it.

## Open Questions

- Whether a debug session should be able to hand over to the driving channel when
  a program needs typing, and take it back afterwards. It is what a user would
  expect and it suspends the session's guarantees while it lasts; worth deciding
  after the console path has been used in anger.
- Whether starting a debug session on a listing that declares no machine, and
  whose machine cannot be inferred, should refuse or should ask — the same
  question the panel change leaves open about its command, and it should be
  answered the same way in both.
- Whether the mirrored screen belongs in the panel the run command opens or in a
  surface of the debug session's own. Sharing it is fewer things on screen;
  separating it means a session and a played machine can be looked at side by
  side, which nothing yet needs.
