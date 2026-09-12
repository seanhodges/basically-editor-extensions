## Why

A user who can run their listing in the editor will, the first time it
misbehaves, reach for the thing every other language in their editor gives them:
a breakpoint in the gutter, a program that stops there, a line highlighted, and
the variables in a pane beside it. What they will find is that they have to go
back to inserting `PRINT` statements, because the only debugger for their machine
is in a browser they are not in.

The editor already has everywhere to put this. It has a gutter that takes
breakpoints, a way to start a program that is going to stop, a pane for
variables, a console, and a toolbar with step and continue on it — all of it
standard, all of it the same for every language, and none of it something a
client has to draw. What it lacks is anything to connect it to.

## What Changes

- **A listing can be debugged where it is written.** The user starts debugging
  the way they start debugging anything else in the editor. Breakpoints set in
  the gutter stop the program before those lines, the stopped line is
  highlighted, and stepping and continuing are the editor's own.
- **The program's variables are shown while it is stopped**, in the pane the
  editor already has for them, read from the machine the program is stopped on.
- **The machine's screen is visible while debugging, and is not typed at.** A
  program stopped part-way through has drawn something, and the user needs to see
  it. What they are shown mirrors the machine; it does not drive it, because a
  machine being driven by a person is not a machine anything can stop or measure.
- **Keys reach a debugged program deliberately.** A program waiting for input
  while being debugged is sent keys by asking for them to be sent, so that the
  machine stays one that advances only when something asked it to.
- **Debugging and playing are the two ways to start a listing, and they are
  different.** Playing is a machine on its own clock that the user types at, and
  it is what running without debugging does. Debugging is a machine that advances
  only as far as the editor asked. A listing is started one way or the other, and
  the client says which.
- **A breakpoint is a BASIC line number.** The user sets one on a row of the
  editor; what reaches the machine is the line number that row carries. A row
  with no line number cannot be stopped on, and the editor is told so rather than
  showing a breakpoint that will never be hit.
- **The client says what cannot be debugged rather than failing at it.** Not
  every machine can say which BASIC line it is executing, and the copy of the
  toolchain shipped inside the client cannot run every machine at all. Both are
  said, with the remedy, at the moment they matter.
- Only the **VS Code client** is affected. No existing behaviour changes and
  nothing is removed; a user who never starts a debug session sees the client
  they had. **Not breaking.**

**This change rests on the toolchain serving its debugger.** The server must be
able to be told which BASIC lines a program is to stop before, to step a stopped
program, to continue it, and to say where a held machine is and whether it can be
stepped at all. That is the `machine-debug` capability of the toolchain, proposed
in the `basically` repository as `debug-a-program-outside-the-browser`. Nothing
here asks the server for anything beyond it, and nothing here can be implemented
before a release carries it.

**It also rests on `play-the-machine-in-the-editor`**, which is where the client
learns to hold a machine of its own and to show one. A debug session is a second
thing done with the same machine and the same conversation, not a second way of
reaching the toolchain.

## Capabilities

### New Capabilities

- `machine-debug`: Debugging a listing in the editor — how a debug session is
  started and what settles the machine it runs on, what a breakpoint set in the
  gutter means to the machine, what the user can see and do while a program is
  stopped, how a debugged program is sent keys, how debugging and playing relate,
  and what the client says when a listing or a machine cannot be debugged.

### Modified Capabilities

- `server-resolution`: A third narrowing of what a resolved server can do. The
  client already asks whether the server it found can run a machine, which is
  narrower than serving the language; whether that machine can be stepped is
  narrower again, and must be asked rather than assumed from either.

`vscode-client` is deliberately absent, and the reason is worth stating: its
account of the client's commands is about the things the protocol has no place
for, and debugging is not one of them — the editor has a place for it, and the
user starts it the way they start any debug session rather than by finding a
command by name. What that requirement does say about restarting the language
server not disturbing a machine is mirrored for a debug session in the new
capability, where a reader looking for it will be.

`machine-panel` is depended on and not modified. What the panel guarantees about
the machine being the editor's own is what a debug session needs and inherits;
the relationship between playing and debugging is stated in the new capability
because it is a thing debugging has to settle, not a change to what a panel is.

`client-packaging` is absent because it needs no further amendment: what the
shipped server can and cannot run is already stated there, and a machine it
cannot run is one this change never gets as far as trying to step.

## Non-goals

- **The Vim and Notepad++ clients.** Only the VS Code client is affected. The Vim
  plugin registers the server with whichever LSP host is present and has no
  debug surface of its own to wear; the Notepad++ notes describe a route with no
  build yet. Neither needs to follow, and the Notepad++ notes need no further
  scoping beyond what `play-the-machine-in-the-editor` already does to them.
- **A debugger of the client's own.** Every answer — where the program is, what
  the variables hold, what a step cost — is the server's. The client sets nothing
  running and decides nothing about a machine.
- **Stepping into or out of anything.** BASIC has a line and the next line. The
  editor is told plainly that this is all there is, rather than being left to
  offer buttons that do nothing.
- **Writing a variable while stopped.** Variables are read. The toolchain
  implements no write path and this change does not ask for one.
- **Conditional breakpoints, hit counts, logpoints, watchpoints, and stopping on
  a runtime error.** A breakpoint is a line number.
- **Memory, registers and disassembly.** Nothing here shows the machine below the
  level of its BASIC.
- **Sound.** As with the panel, a debugged machine is seen and not heard.
- **Editing in the panel, and replacing the browser IDE.** Unchanged from
  `play-the-machine-in-the-editor`.
- **Per-line profile cost shown in the editor.** The toolchain measures it and
  the editor has somewhere to put it; it is a change of its own and not part of
  making a program stop.

## Impact

- **The VS Code client** gains its first debug contribution and the adapter
  behind it. The adapter is the second consumer of the operations conversation
  the panel change establishes, not a third way of talking to the toolchain, and
  it holds the same machine the panel does.
- **What ships** is unchanged in shape: no new dependency is expected, because
  the editor allows a debug adapter to be implemented inside the extension rather
  than as a program of its own. The server copy inside the client stays exactly
  what it is today.
- **The tests** gain the second half of what the panel change starts: a real
  conversation with a real server that stops a real program on a line and reports
  where it stopped. As with the panel, a run against a server that does not serve
  this has exercised nothing.
- **The pinned version** moves once more, in the one place it is named, when a
  release carries the debugger.
- **The READMEs** gain debugging beside running, and must say that the machine
  behind a debug session is one nobody types at without asking.
