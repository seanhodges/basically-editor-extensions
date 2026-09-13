## Context

The export change established the ground this stands on: the operations
conversation that holds no machine, the module free of the editor holding what is
to be done and what the user is told, the thin shell that does the editor's work,
and the toolbar. `convert` is an operation of the same toolchain as `build`,
needing neither a ROM nor a machine, reached the same way. See the READMEs and
`CLAUDE.md` for the module map and the precedence chains.

**The server contract changes**, and the change is not here.
`declare-the-machine-in-a-converted-program`, in the `basically` repository, is
what lets a conversion answer with source that says which machine it is for. A
client cannot grow a capability the server does not serve, and this change rests
on that one.

## Goals / Non-Goals

**Goals:**

- A machine's own file opens as a listing, checked against the machine it came
  from.
- Everything the conversion could not carry is reported or written, never
  dropped.
- Nothing about which machine a file belongs to is decided in this client.

**Non-Goals:**

- Audio import, disassembly, a block model, boot-disc reconstruction, writing
  over an open listing.

## Decisions

**The machine chain runs backwards here, deliberately.** Everywhere else in this
client the order is the listing's own declaration, then the configured machine,
then what can be inferred. For an import the file's own format comes first: a
`.p` is a ZX81 file whatever the setting says, and honouring the setting would
read it as something it is not. The server already resolves it in exactly that
order and declines, naming every candidate, when a format belongs to more than
one machine — so the order is not re-implemented here, it is simply not
overridden by passing a machine when none is needed.

**A refusal that names the candidates is an answer, not a fault.** The client
already does this for `lint` refusing for want of a machine, and reads two more
refusals the same way: a format more than one machine claims, and a format none
claims. Either becomes a list to choose from, and the same bytes are sent again
with the machine named. The alternative — asking first, every time — would make
the user answer a question the file usually answers itself.

**A third refusal is the pinned server's age.** A server that has never heard of
the declaration refuses the request for it. That refusal is caught, the same
conversion is asked for without it, and the machine is said in words instead. A
client never refuses over a version number, and this is the same rule applied to
an option rather than to a runtime.

**The listing lands untitled.** A listing that has never been saved is already
guaranteed to be served exactly as one on disk, so an untitled document loses
nothing — and the user, not the client, decides where a program from someone
else's tape belongs on their disk. It is opened with its language set rather than
inferred from a name it does not yet have; the declaration the server wrote is
what then settles its machine.

**Blocks are written, and the folder is asked for.** A listing here is text, and
most machines' blocks have nowhere in text to live, so a block recovered from a
`.TAP` would otherwise be named and then lost. Writing them needs a folder, and
there is not one: the listing is untitled, and the folder holding the file that
was imported is somewhere the user chose for something else. So the user is asked,
once, and only when the file actually held blocks. Declining leaves the listing
open and nothing written, because the listing is the thing that was asked for and
it has already arrived.

**No file-type filters on the dialog, and no context menu on the explorer.**
Either would need a list of extensions in the manifest, which is a fact about
machines, held in this client, going stale the moment the toolchain gains a
format. The server's answer about which formats a machine reads is available, but
it is per machine and the point of the dialog is that the user has not said which
machine — so the honest dialog is one that shows every file.

**The toolbar entry is bound to a listing and the palette entry is not.** They
differ because the questions differ: a title bar is about the file beneath it, and
there may be no file at all when someone wants to open a program.

## Risks / Trade-offs

- **A user imports with an older pinned server and gets an undeclared listing**
  → they are told the machine in words, and the listing is served against the
  configured machine until they declare or set one. The remedy is the release,
  and the fallback is not silent.
- **The file's format settles a machine the user did not expect** → that is the
  point, and the machine is named in what they are told, so a surprise is visible
  rather than buried in a wrongly-coloured listing.
- **A folder prompt after an import is one dialog more than a user expected** →
  it is asked only when the file held blocks, which is the case where the
  alternative is losing them.
- **Two commands writing files, in two modules** → the writing is one place in the
  shell module, used by both, so there is one answer to what happens when a path
  cannot be written.
