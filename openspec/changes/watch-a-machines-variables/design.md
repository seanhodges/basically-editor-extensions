## Context

The client already asks the server for variables — `Operations.variables()` calls
the `variables` operation, and the debug session answers the editor's request for
what is in scope from it. What it does not have is anywhere to put them that
outlives a stop, and it cannot ask at all while a listing is being played.

Both halves reach the same machine through the same conversation. A window has
one connection to the toolchain and one machine on it; the panel and a debug
session share it, because the toolchain gives one machine to one connection. So
this adds no conversation, no process and no second machine — only a reader of
the one that is there, and somewhere to show what it reads.

See the READMEs and CLAUDE.md for how the client is put together; the three
precedence chains that settle which machine, which server and which runtime are
unchanged here and are not restated.

## The server contract changes, and the change is not here

**It does.** Reading the variables of a machine that is being played is refused by
the toolchain as it stands: the operation is declared as a measurement, and a
played machine refuses measurements. The matching change is
`read-a-played-machines-variables` in the `basically` repository, which files it
with the reads instead — where the screen already is — on the grounds that it
spends no frames and changes nothing.

This change rests on that one and cannot ship before a release carries it. Until
then the played half can only be driven against a toolchain checkout, which is
what `BASICALLY_SERVER_PATH` is for. The debug half needs nothing new: a stopped
machine is idle, and its variables have always been readable.

## Goals / Non-Goals

**Goals:**

- One place showing what the held machine holds, in both modes, that the user
  can put where they work.
- What a played program holds, followed as it runs.
- Every state said plainly: no machine, a machine that cannot report, a server
  that will not answer for a played machine.

**Non-Goals:**

- Setting a variable or watching an expression. The server offers neither.
- Replacing or altering the pane the editor draws for a stopped session.
- A setting for how often a played machine is read.

## Decisions

### The decisions live in a module free of `vscode`, the view is a companion

**Decision.** What to show for each answer, when a read is due, and what a refusal
means go in a module that does not import `vscode`. The tree that draws it is a
thin companion, as the machine status item is to `machineStatus.ts`.

**Why.** It is the split this client already uses for exactly this reason: a plain
Node test can then drive what a user would be shown for every state, over no
editor and no server, which is the only way these states get covered at all. The
states here are the interesting part — a machine that cannot report is a
different thing from a window holding no machine, and both are different from a
server that refuses.

**Alternatives considered.** *The provider deciding as it renders* — puts every
state behind an editor the tests cannot start.

### A read is due at a stop, and on a timer only while playing

**Decision.** While a listing is played, the view reads on a timer. While a debug
session is under way, it reads when the program stops somewhere new and at no
other time. The session says so through one new member on the interface it
already reports to its host through, called from the single point every stop
passes through.

**Why.** They are different machines to read. A played machine advances on its own
clock, so only a timer can follow it. A debugged machine advances only when asked,
so between stops there is nothing to see, and a timer would ask anyway — and each
ask would queue behind the step or continue in flight on the one connection, to
arrive with the answer the stop was about to give. Reading at the stop is both
cheaper and more correct.

**Alternatives considered.** *A timer in both modes* — pointless reads that
serialise behind the stepping. *The editor's own stopped event* — the session is
inline and already knows; going out to the editor and back to learn what we just
did is a longer way round.

### One read at a time, and none while nothing is looking

**Decision.** A read is never begun while one is outstanding, and the timer does
not run while the view is not visible.

**Why.** Replies are matched by id, so overlapping calls are legal on the wire and
would simply pile up on the machine's thread, each arriving later than the last.
Single-flight makes the cadence self-limiting: a slow answer reads less often
rather than accumulating. And a view in a background tab is nobody looking, which
is the cheapest read of all.

### A refusal is a state, not a failure

**Decision.** A server that refuses a read of a played machine is rendered as its
own state, saying so and what the remedy is. It is not thrown, not logged as an
error, and does not stop the view working at the next stop.

**Why.** The client is pinned to a server version but can be pointed at any
toolchain the user installs, so it will meet servers older than the one it ships
with. The standing rule here is never to refuse over a version number: a client
that failed loudly would leave a user with a working editor, a working machine
and a broken-looking table, when the honest answer is one sentence.

## Risks / Trade-offs

- **The pinned server cannot answer the played half until a release carries the
  toolchain change.** → The client-against-server check covers what the pinned
  server does answer; the played half is driven against a checkout with
  `BASICALLY_SERVER_PATH` until the pin moves, and the refusal state is what a
  user on an older server gets meanwhile.
- **A view duplicating the editor's own pane during a session.** → It is the same
  account of the same machine, so they agree; what this one adds is being in the
  user's own place and surviving the session. The editor's pane is untouched.
- **A table that stops updating without saying so.** → Every state says which it
  is, and the states that stop a read are the ones the user is told about.
