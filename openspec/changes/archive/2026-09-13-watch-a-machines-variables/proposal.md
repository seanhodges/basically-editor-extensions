## Why

A user watching their listing run in the editor cannot see what it holds. The
variables are there — the server reports them, and the client already asks for
them — but only inside a debug session, only while the program is stopped, and
only in the pane the editor draws for a session that has to be started first. Run
the listing and play its machine, which is the ordinary way to see a program
work, and there is nowhere the variables appear at all.

The browser IDE has watched a running program's variables since it had an
emulator. The same listing, in the editor the user actually writes it in, offers
nothing.

## What Changes

- **A view shows what the machine holds**, in the editor, wherever the user docks
  it. It shows the variables of the machine this window is holding, whether the
  listing is being played or debugged.
- **While a listing is being played the variables follow the machine**, changing
  as the program changes them, because a played machine goes on running and the
  server now answers a read of it.
- **While a listing is being debugged they are what the stopped program holds**,
  refreshed each time the program stops somewhere new.
- **A machine that cannot report its variables is said to be one**, and a window
  holding no machine says what to do rather than showing an empty table.
- No existing surface is taken away: the debug session's own variables pane is
  the editor's and is untouched. **Not breaking.**

## Non-goals

- **Setting a variable, or watching an expression.** The server reports what the
  program holds and offers no way to evaluate or assign anything; a client that
  answered either would be inventing it. The debug session already declines both
  and goes on declining them.
- **Reading anything else of the machine.** Its memory, its screen as text, its
  measurements — none of them is this, and the panel already shows its screen.
- **Changing what a debug session shows or how it is started.** What the editor
  draws from a stopped session stays the editor's.
- **The Vim and Notepad++ clients.** Only the VS Code client has a surface a
  table could live in. The Vim plugin registers the server with whichever LSP
  host is present and has no panel; the Notepad++ notes have no build. Neither
  needs to follow.
- **Working against a server that does not answer.** A server older than the one
  this pins refuses a read of a played machine; the view says so and does not
  pretend otherwise, but nothing here works around it.

## Capabilities

### New Capabilities

None. The guarantee belongs to the two capabilities that already govern running
and debugging a listing.

### Modified Capabilities

- `machine-panel`: a played listing's variables are visible while it runs and
  follow the machine as it advances.
- `machine-debug`: what a stopped program holds is visible in the editor whether
  or not the session's own pane is open, and stays visible across the session.

`server-resolution` and `client-packaging` are deliberately absent. Which server
is started, what runs it, and what ships in the package are unchanged but for the
pinned version, which is not a behaviour a spec states.

## Impact

- **The VS Code client** gains a contributed view, a module deciding what it
  shows, and one more member on the interface a debug session reports through. It
  gains no setting: how often a played machine is read is not a decision to hand
  a user.
- **The server contract** is changed, and the change is not here. Reading the
  variables of a machine that is being played is refused by the toolchain as it
  stands; `read-a-played-machines-variables` in the `basically` repository is what
  makes it a read, and this change rests on it. Until a release carries it, the
  played half of this view can only be driven against a toolchain checkout.
- **The pinned server version** in the VS Code manifest moves to the release
  carrying that change. It is named in one place and that is the whole of moving
  it.
- **The tests** gain a client-against-itself check over no server at all, in the
  manner of the one for the machine status item. What a real server answers for a
  played machine is covered by the client-against-server check.
- **The READMEs** gain what the view shows and when it is reading.
