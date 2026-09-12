## Context

`play-the-machine-in-the-editor` built the panel and confirmed it by hand on one
computer: the frame carries the machine's own display, and keys reach the
machine. The content rules the frame needed were `default-src 'none'`,
`frame-src` naming one origin, and nothing else.

That origin is the one `vscode.env.asExternalUri` gives back. Where the extension
and the window are on one computer it gives back what it was handed, so the
confirmed run exercised none of the mapping. Where they are apart it gives back
something else — the editor's own way of reaching a service beside the extension
— and that is the whole of what is unconfirmed. The panel is already written to
it, deliberately, and `CLAUDE.md` and the client README state what the panel is;
neither is restated here.

## Server contract: no

The toolchain is asked for the same address it already gives back, over the same
operations conversation, by a client running on the same side of the connection
it was already on. Nothing here needs the `basically` repository to serve
anything new. Should the confirmation show otherwise — an address that cannot be
carried because of how the toolchain binds it, say — that is a change against
that repository's `machine-play` capability, and this one stops until it exists
rather than working around it here.

## Goals / Non-Goals

**Goals:**

- Knowing, rather than assuming, that a remote user gets a machine they can type
  at.
- Fixing what stands in the way, in the client, where the fix is the client's.
- Saying what is not carried, where something is not, so a remote user has
  something to read rather than an empty frame.

**Non-Goals:**

Everything else about the panel, the other clients, the debugger, and a tunnel
of the client's own. The proposal lists these.

## Decisions

### Confirm it before changing anything

**Decision.** The first work is a run against a real remote workspace, with
nothing changed. What it shows decides what follows, and the three places it can
fail are known in advance: the address reaching the window, the origin the
panel's content rules name, and keys travelling that distance.

**Why.** The panel is written to the documented contract and may well already be
right, in which case the change is a confirmation and a sentence in the README.
Changing code first would be guessing at a failure nobody has seen.

### The editor's mapping is the only carriage

**Decision.** The address is carried by `vscode.env.asExternalUri` and by nothing
else. Where that does not reach, the panel says so.

**Why.** It is what the editor offers for exactly this, it is what every other
extension showing a local service uses, and the alternative is a client growing
a tunnel — a thing to secure, to configure and to explain, for a case the editor
already answers. What the panel's address admits is already stated in the
client's own words, and it is not made looser here.

### More than one remote arrangement, and they are not the same

**Decision.** The run covers the arrangements a user actually has: a workspace
over SSH, a container, a tunnel, and the editor in a browser. Each is recorded
separately — carried, or not carried and why.

**Why.** They differ in where the window runs and in how the mapping is served,
and a browser window is the one most likely to differ: the panel's frame is then
inside a page rather than inside an application, and the same origin rules do not
obviously follow. One run against one arrangement would tell a user nothing
about the arrangement they have.

## Risks / Trade-offs

- **No suite can hold this** → Nothing here is checked by `npm test`; a second
  computer is not something a test has. Mitigated by writing down what was run
  and what was seen, in the change and where the panel is documented, so the next
  person can repeat it rather than take it on trust.
- **A failure may not be the client's to fix** → Where the address cannot be
  carried at all, the remedy is the toolchain's or the editor's, and this change
  can only say so. Accepted: saying so is worth more than a user meeting an empty
  frame.
- **What is confirmed today can lapse** → The mapping is the editor's, and it can
  change under a client that never hears about it. Accepted; the panel fails
  visibly rather than quietly, and the panel says what it cannot do.
