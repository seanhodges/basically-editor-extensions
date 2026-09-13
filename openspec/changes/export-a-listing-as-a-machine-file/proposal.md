## Why

A listing in the editor cannot leave it. The extension serves, runs and debugs a
program, but a user who wants that program on a real ZX81 — or in someone else's
emulator, or on an SD card — has nowhere to go. The browser IDE has exported
programs as their machine's own file since it had an emulator; the same listing,
in the editor the user actually writes it in, offers nothing.

Nothing new is needed from the toolchain. Building a listing into a file the
machine loads is already an operation of it, needing no ROM and no machine, and
already reachable over the operations conversation this client holds for running
and debugging. What is missing is a way to ask for it and somewhere to put the
answer.

## What Changes

- **A listing can be exported as a file the machine loads**, from the listing
  being edited, unsaved changes and all — the same text that would be run.
- **The formats offered are the ones the server says that machine has.** The
  client keeps no list of formats and no idea which machine has which; it asks,
  and shows what it is told, under the server's own labels.
- **The user says where the file goes.** Where a format produces more than one
  file, the rest are written beside the first under the names the format gave
  them, and the user is told what was written where.
- **A listing with a fatal problem is not exported.** Nothing is written, and the
  user is told that is why, rather than finding a file that will not load.
- **The command is offered twice**: by name, and as a button on the editor's own
  title bar. The extension has no toolbar today, so this adds one — and
  **running a listing joins it**, since a toolbar that can export a listing but
  not run it would be a strange first toolbar.
- No existing surface is taken away, and the command palette entries are
  untouched. **Not breaking.**

## Non-goals

- **Importing.** Reading a machine's file back into a listing is the other
  direction and is `import-a-machine-file-as-a-listing`, which builds on what
  this establishes.
- **Playing a program through the speakers, or recording one from a
  microphone.** A cassette `.wav` is offered where a machine has that format,
  because it is a file the toolchain writes like any other; making a sound is
  not something this client does.
- **The serial bridge.** It is a browser API and there is no editor equivalent.
- **Memory blocks as a thing the editor holds.** A listing here is text; machine
  code travels inside it where the machine's own tokenizer takes it, and the
  toolchain builds from that text. There is no block model in this client to
  carry or to drop.
- **Deciding anything about a machine.** Which formats exist, what they are
  called, and what a build produced are all the server's answers, carried
  through as given.
- **The Vim and Notepad++ clients.** The Vim plugin registers the server with
  whichever LSP host is present and holds no operations conversation; the
  Notepad++ notes have no build. Neither needs to follow.

## Capabilities

### New Capabilities

- `program-transfer`: what a user can do about getting a program between the
  editor and the machine's own file formats — for now, the export half.

### Modified Capabilities

- `vscode-client`: the requirement covering the commands the extension offers by
  name gains the export command, and gains the fact that a command may also be
  offered as a control on the listing being edited.

`server-resolution`, `machine-panel` and `client-packaging` are deliberately
absent. Which server is started and what runs it are unchanged; running a
listing keeps every guarantee it has and only gains a second way to be asked
for; nothing about what ships changes but the manifest's own contents, which is
not a behaviour a spec states.

## Impact

- **The VS Code client** gains two modules in the shape it already uses — one
  free of the editor, holding what is to be done and what the user is told, and
  one thin shell doing the editor's work — plus one operation wrapper and one
  more thing named on the facts it already asks about a machine.
- **It writes a file for the first time.** Nothing in this client has ever opened
  a dialog or written to disk; everything sent to the toolchain has been the text
  of a buffer. That boundary is the part of this worth reviewing carefully.
- **The server contract is unchanged.** Every operation this needs is one the
  pinned server already serves, so this ships without waiting on a release, and
  the pinned version does not move.
- **The tests** gain a client-against-itself check over no server at all, in the
  manner of the one for the machine status item, and one case in the
  client-against-server check that builds a listing against the real server. The
  same suite gains a cross-check of the manifest against itself, so a toolbar
  entry naming a command that does not exist fails the build rather than becoming
  a button the editor answers as not found.
- **The README** gains what the command does and where the file goes.
