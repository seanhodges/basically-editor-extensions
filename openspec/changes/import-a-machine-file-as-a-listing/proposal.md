## Why

A program that already exists on real hardware, in an archive, or in a file
someone sent cannot be opened in the editor. The extension can now send a listing
out as the machine's own file; it cannot read one back. The browser IDE has done
both directions since it had an emulator — a user can grab an old program off a
real machine, edit it, and send the new version back — and the editor offers only
the outward half.

The toolchain already reads a machine's binary back into BASIC, needing no ROM
and no machine, over the same operations conversation the export uses. What is
missing is a way to ask for it, somewhere to put the listing that comes back, and
an honest account of what the conversion could not carry.

## What Changes

- **A machine's program file can be opened as a listing.** The user picks the
  file; the recovered BASIC opens as a new unsaved listing, to be saved wherever
  they like.
- **The machine is the file's, not the editor's.** Which machine a file belongs
  to is settled by the file's own format, which is the opposite of how every
  other question about a machine is settled here — a `.prg` is a Commodore file
  whatever the editor is configured for. Where a format belongs to more than one
  machine, or to none the server knows, the user is asked rather than guessed at.
- **The imported listing says which machine it is for**, because the server is
  asked to declare it, so the listing is checked against the machine it actually
  came from from the moment it opens.
- **What the conversion could not carry is reported**, not dropped: the warnings
  the machine's own reader raises, and the parts of the file that are not BASIC.
- **Recovered machine-code blocks are written as files**, into a folder the user
  is asked for, so that nothing in the file is lost merely because a listing in an
  editor is text. Declining the folder is not a failure — the listing is already
  open.
- **The command is offered by name and on the editor's toolbar**, beside run and
  export.
- No existing surface is taken away. **Not breaking.**

## Non-goals

- **Reading a cassette recording.** Decoding tape audio needs the toolchain to
  turn a `.wav` into a signal, which nothing outside the browser does today. Only
  the machines' own binary formats are read here.
- **Disassembling machine code.** What is read is a tokenised program; a block of
  bytes that is not BASIC is preserved as bytes and named, never guessed at.
- **A block model in the editor.** Blocks come out as files beside the listing,
  not as something this client holds, edits or sends back. A listing exported from
  here is built from its text, as it was before.
- **Reconstructing a boot disc or a multi-part tape.** The toolchain names the
  further files it found but does not hand over their bytes; the user is told what
  was named rather than being given a partial file.
- **Replacing what the user is editing.** An import opens something new, and never
  writes over an open listing.
- **The Vim and Notepad++ clients**, for the reasons the export change gives.

## Capabilities

### New Capabilities

None. `program-transfer` is introduced by `export-a-listing-as-a-machine-file`
and gains the other direction here.

### Modified Capabilities

- `program-transfer`: gains the import half — that a machine's own file can be
  opened as a listing, that the machine it is read as is the file's, that the
  listing says which machine it is for, and that nothing the conversion could not
  carry is dropped silently.
- `vscode-client`: the requirement covering the commands offered by name gains
  the import command, which unlike its neighbours is offered whether or not a
  listing is open.

## Impact

- **Depends on two changes.** `export-a-listing-as-a-machine-file` establishes the
  capability, the two modules and the toolbar this extends rather than repeats.
  `declare-the-machine-in-a-converted-program`, in the `basically` repository, is
  what makes the recovered source say which machine it is for; without it the
  listing opens undeclared and falls back on whatever the editor is configured
  for, which may be the wrong machine.
- **The pinned server version** in the VS Code manifest moves to the release
  carrying that change. Until then the client asks for the declaration, is refused
  by a server that has never heard of it, and imports without it — saying the
  machine in words instead. A client never refuses over a version number.
- **The client writes files in a second place**, and asks for a folder to write
  them in. It also opens an untitled document for the first time.
- **The tests** gain the other half of the round trip in the client-against-server
  check — the bytes an export produced, read back — which is what holds this
  client and that server change to each other.
- **The README** gains what the command does, where the listing lands, and what
  becomes of what the file held besides BASIC.
