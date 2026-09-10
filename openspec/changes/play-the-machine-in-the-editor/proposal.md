## Why

A user writing a BASIC listing in VS Code has the whole language behind them —
problems as they type, completion of the machine's own keywords, hover,
jump-to-definition, the outline, a variable's uses and colour. What they cannot
do is run it. To see the program they just wrote actually do something they must
leave the editor for a terminal or for the browser IDE, and come back.

The machine has never been far away: the same toolchain the client already
starts to serve the language is the one that runs machines. It has simply never
been asked to, because there was nothing an editor could do with a machine once
it had one.

## What Changes

- **A listing can be run from the editor and played there.** A command runs the
  listing on the machine it is written for and opens a panel showing that
  machine, and the user can type at it — a `READY` prompt, a program asking a
  question, a game.
- **The panel's machine belongs to the editor.** It is not the machine the
  user's terminal is holding, and nothing either of them does disturbs the
  other. Two editor windows do not share one machine either.
- **The client says what it cannot do rather than failing at it.** The copy of
  the toolchain that ships inside the extension deliberately carries none of the
  dependency tree that exists for running machines, so there is a machine it
  cannot boot; and no ROM images ship with it, so the first run of a machine
  needs the user's agreement to obtain one. Both are stated plainly, with the
  remedy, at the moment they matter.
- **Which server can run a machine becomes its own question.** The client
  already resolves which server to start and which runtime runs it. Running a
  machine asks something narrower of that server than serving the language does,
  and a client that resolved a server good enough for one is not thereby
  entitled to assume it is good enough for the other.
- **The pinned server moves to one that offers playing.** The version named in
  the manifest is the whole of what the build, the tests and the release use, so
  this is a single edit — but the client cannot ship until a toolchain release
  offers it.
- No existing behaviour changes and nothing is removed. A user who never runs
  the new command sees the client they have today. **Not breaking.**

**This change rests on two things the server offers.** Its operations
conversation over standard streams, so the client can hold a machine of its own
rather than reaching through the command line's shared one; and a way to play a
held machine, giving back an address a web view can be pointed at. Those are the
`machine-play` and `headless-cli` capabilities of the toolchain, and both are
served by `@ba.sical.ly/cli` from 0.1.5 — the version the pin moves to. Nothing
here asks the server for anything beyond them.

## Non-goals

- **Sound.** The panel shows a machine and takes keys. The toolchain is not
  carrying audio in this round, so neither is the client.
- **The Vim and Notepad++ clients.** Only the VS Code client is affected. The
  Vim plugin registers the server with whichever LSP host is present and has no
  surface that could show a machine; the Notepad++ notes describe a route that
  has no build yet. Neither needs to follow, though the Notepad++ notes' claim
  that the server "needs no ROM" should be scoped to the language server so it
  does not quietly become untrue.
- **Editing in the panel.** The panel shows a machine and sends keys to it. The
  listing is edited in the editor, as it is now.
- **Replacing the browser IDE.** The panel runs a listing and plays it. The
  hardware transfer, the assistant, the samples and the rest of the IDE stay
  where they are.
- **Building or converting files from the editor.** Running is what this adds.
  Other operations the toolchain offers stay where they are reachable today.
- **Debugging.** No breakpoints, no stepping, no variable inspection. This is a
  machine, played.

## Capabilities

### New Capabilities

- `machine-panel`: Running the listing in the editor and playing its machine
  there — what settles which machine it runs on, what the panel guarantees about
  the machine being the editor's own, what the user can do with it, and what the
  client says when the machine cannot be run rather than failing at it.

### Modified Capabilities

- `server-resolution`: The order in which a client looks for its server is
  unchanged, but a second question is added beside it — whether the server it
  found can run a machine, which is a narrower thing than being able to serve
  the language, and which the client must answer before offering to run rather
  than after failing to.
- `client-packaging`: What the copy shipped inside the client can and cannot do
  is now something a user can reach, so the packaging guarantee says which
  machine it cannot boot and why, rather than leaving it as a property of the
  fetch script.
- `vscode-client`: The client offers a command that runs the listing and plays
  its machine.

`machine-selection` is deliberately absent. Which machine a listing is for is
already settled by its own declaration, then what the user configured, then what
it can be inferred to be, and running uses that same answer unchanged. What the
panel does when no machine can be settled belongs to the new capability, because
it is a thing the panel says, not a change to how a machine is chosen.

## Impact

- **The VS Code client** gains a command, a panel, and a second way of talking
  to the toolchain beside the language client — the same resolution, the same
  runtime, a different conversation. The module that decides where the server is
  and what runs it is already written to be asked for any operation, and already
  kept free of the editor's own API so a plain Node test can drive it; both
  properties are relied on here rather than changed.
- **What ships** is unchanged in shape: no new dependency is expected, and
  nothing is added to the packaged extension beyond the client's own code. The
  server copy inside it stays exactly what it is today, limits included.
- **The tests** gain the harder half of this change. The check that matters here
  drives a real conversation with the server the extension would really start;
  a client that can hold a machine needs the same treatment, and it cannot be
  written against the pinned server, which serves none of this — the pin moves
  first, or the run says nothing.
- **The pinned version** moves once, in the one place it is named.
- **The READMEs** gain the command, and must say — in the client's own words —
  what the address behind the panel admits, because it admits acting on a
  machine rather than watching one.
