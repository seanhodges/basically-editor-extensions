## Why

The client can already run a listing and play its machine in the editor, and can
watch what its variables hold while it runs. What it cannot show is where the
program is living: which parts of the machine's memory it occupies, and which
addresses it is touching as it goes.

The browser IDE has shown that since it had an emulator — the machine's whole
address space as colour-coded bands, with the addresses the processor is reading
and writing lit over them as the program runs. The same listing, in the editor
the user actually writes it in, offers nothing of the kind: the only account of
memory an editor can get is the static region table, and only by asking what a
machine is.

The toolchain is growing the answer. `watch-a-machines-memory` in the
`basically` repository makes a held machine's memory map a third projection,
served at an address anything that shows a web page can be pointed at. This is
the client that points at it.

## What Changes

- **A map of the machine's memory is shown in the editor**, in a place of the
  user's own that they can put where they work. It shows the memory layout of
  the machine this window is holding, and the addresses that machine is
  touching.
- **While a listing is being played the map follows the machine**, because a
  played machine goes on running and the toolchain serves the map for as long as
  it does.
- **While a listing is being debugged the map shows what the stepping touched**,
  so a step is visible as the memory it moved rather than only as a line number.
- **The map is shown from an address of its own, and the client says what
  holding it admits** — watching the machine's memory and nothing else. That is
  a weaker claim than the one the panel's address carries, and the two SHALL NOT
  be read across to one another.
- **A machine that cannot be mapped is said to be one**, and said which way: a
  machine whose layout the toolchain does not describe is not the same as one
  that cannot report what it is touching.
- **A window holding no machine says what to do** rather than showing an empty
  frame.
- No existing surface is taken away. The panel, the variables view and the
  editor's own debug panes are untouched, and the map neither ends the panel nor
  is ended by it. **Not breaking.**

## Non-goals

- **Reading or writing what an address holds.** The toolchain reports which
  addresses were touched and never what they contain; a client that showed a
  value, or offered to change one, would be inventing it. The debug session goes
  on declining to read or write memory.
- **Drawing the map ourselves.** What is at the address is the toolchain's, as
  the panel's picture already is. The client names the address, frames it, and
  keeps no account of what it shows.
- **The addresses the listing writes to.** The markers the browser IDE draws
  over its map come from reading the program's source, not from asking the
  machine, and they belong to whatever holds the source.
- **A setting for any of this.** How often a map is read is the toolchain's
  business, and where the user docks it is the editor's.
- **The Vim and Notepad++ clients.** Only the VS Code client has a surface a
  framed address can live in. The Vim plugin registers the server with whichever
  LSP host is present and has no panel; the Notepad++ notes have no build.
  Neither needs to follow.
- **Working against a server that does not serve one.** A server older than the
  one this pins has no map to project; the client says so and does not pretend
  otherwise, but nothing here works around it.

## Capabilities

### New Capabilities

None. The guarantee belongs to the two capabilities that already govern running
and debugging a listing in the editor.

### Modified Capabilities

- `machine-panel`: the memory map of a played listing is visible while it runs
  and follows the machine; and what holding an address admits is now two
  statements rather than one, because there are now two addresses and they admit
  different things.
- `machine-debug`: what a stepped program touched is visible in the editor,
  alongside where it stopped and what it holds.

`server-resolution`, `machine-selection` and `client-packaging` are deliberately
absent. Which server is started, what runs it, which machine a listing is for and
what ships in the package are unchanged but for the pinned version, which is not
a behaviour a spec states.

## Impact

- **The VS Code client** gains a contributed view that frames an address, a
  module deciding what it shows, and one more thing a debug session reports
  through. It gains no setting.
- **The server contract is changed, and the change is not here.** Nothing in the
  toolchain projects a memory map as it stands; `watch-a-machines-memory` in the
  `basically` repository is what makes it a projection, and this change rests on
  it. Until a release carries it, this view can only be driven against a
  toolchain checkout.
- **The pinned server version** in the VS Code manifest moves to the release
  carrying that change. It is named in one place and that is the whole of moving
  it.
- **The tests** gain a client-against-itself check over no server at all, in the
  manner of the ones for the machine status item and the variables view. What a
  real server answers for a map is covered by the client-against-server check.
- **The READMEs** gain what the map shows, when it is reading, and — in the
  client's own words — what holding its address admits.
