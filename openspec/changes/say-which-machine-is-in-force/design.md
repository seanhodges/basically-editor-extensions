## Context

The client already knows how to ask which machine a listing is for, and already
knows how to tell the four answers apart. `src/operations.ts` holds both: the
conversation reports the machine the toolchain settled on when it lints a
listing, and reads a refusal for want of a machine as "it declares none";
`planRun` takes what was declared, what the user configured and what the server
says it has, and returns one of *run this machine*, *nothing settles it*, *a
machine this server does not have*, or *a machine it cannot run as it stands*.
The machine panel already drives exactly that path.

So nothing needs inventing. What is missing is a surface, and a decision about
how often to ask.

`CLAUDE.md` and the READMEs describe the precedence chains and the conventions;
neither is restated here.

## Server contract: no — but it should change

Nothing here requires the server to answer anything new, and this can be built
against a released toolchain today.

It should change anyway. The language server has already settled the machine for
every document it colours — that is how it decides what to colour — and it
advertises no way to ask it. Reading its declared capabilities confirms this:
the standard providers and the semantic-token legend, and no request, command or
experimental entry of its own. So the client has to get the answer from the
operations conversation instead, which means starting a toolchain process to
re-derive something the server already knows.

**The matching change to ask for in the `basically` repository** is for the
language server to report the machine it bound a document to, as part of what it
publishes about that document. The requirement in this change is written so that
it says nothing about which conversation carries the answer, and moving to that
report later would delete this design's caching and debouncing rather than
change any guarantee. Until then the operations conversation is the only way,
and the cost is stated below rather than hidden.

## Goals / Non-Goals

**Goals:**

- The machine in force for the listing being edited, visible without opening
  anything.
- The absence of one visible just as plainly, so correct silence from the server
  cannot be mistaken for a broken client.
- The four answers told apart, because their remedies differ.
- The answer always the server's.
- No cost the user would notice, and none at all for a listing whose answer is
  already known.

**Non-Goals:**

- Deciding anything about machines in the client.
- Restating the remedy the server's problem already carries.
- A per-keystroke question.
- Anything for a file that is not a BASIC listing.

## Decisions

### The surface: the status bar, not a decoration or a panel

It has to be somewhere the user's eye already goes when the file in front of
them changes, and it has to be able to say something when there is nothing wrong
— which rules out the problems panel, whose whole vocabulary is things being
wrong. It has to be per-editor rather than per-listing, because the question is
"what is this being checked against" and not "what is at line 40", which rules
out a decoration in the text. And it has to be droppable: a user who does not
want it should be able to hide it the way they hide everything else there.

That is the status bar, which is also where every other language in the editor
says this kind of thing, so it needs no explaining.

### What it says, in the four cases

One short phrase each, and the machine's own name rather than its id, since the
name is what the user picked from and the id is what the setting holds:

- settled: the machine's name.
- nothing settled: that no machine is settled — plainly, not as an error, since
  a project of listings that each declare their own machine is a normal thing
  and this is the honest answer for a listing that declares none.
- named but not had: that this server does not have the machine that was named,
  and which name that was.
- had but not runnable: the machine's name, and that it cannot be run as it
  stands. This one is deliberately *not* an absence: the listing is being
  checked against that machine perfectly well, and only running it is affected.

The last case is the reason the item cannot simply be "machine or no machine".
Collapsing it would tell a user their listing is unchecked when it is being
checked.

The remedy is not repeated. Choosing a machine is reachable from the item, which
is the action a user wants after reading any of the last three, and the sentence
explaining what to set stays where `machine-selection` already puts it.

### When it asks, and what it remembers

The question is asked when the listing being edited changes and when one is
saved. Not as the user types: the answer can only change when the text changes,
but a short-lived toolchain process per keystroke is not worth a label being
fresh between two characters.

The answer is remembered against the document and the version of it that was
asked about, so moving between two open listings asks nothing, and an edit that
is then undone asks nothing. While an answer is being waited for, the item says
that it is being worked out rather than showing the previous listing's machine —
showing the wrong machine confidently is worse than showing nothing briefly.

A question that fails — no server, a runtime that cannot run it — shows nothing
rather than an error. The client already has a place for that, and it is the
output channel; a status item that turns into a fault report for a fault it is
not about would be its own bug.

### Why this is worth writing down as debt

Every one of those three paragraphs — debounce, cache by version, a pending
state — exists only because the answer costs a process. If the server comes to
report the bound machine over LSP, all of it goes: the answer arrives unasked,
for exactly the document it is about, already correct. The requirement is
therefore written in terms of what the user sees, and this design is the part
expected to be thrown away.
