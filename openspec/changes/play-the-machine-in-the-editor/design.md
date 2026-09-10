## Context

The VS Code client starts one thing today: the language server, over its
standard streams. How it finds that server and what runs it is settled by a
module deliberately kept free of the editor's own API so a plain Node test can
drive the same resolution the shipped extension uses; `CLAUDE.md` states the
three precedence chains and the READMEs state them to users. Two properties of
what is already there are load-bearing here and are reused rather than changed:
the resolution is written to be asked for **any** operation of the toolchain,
not only the one that serves the language, and the client already asks the
server what machines it has rather than carrying a list of its own.

What is new is that the client needs a machine, and a machine is not something a
language server has. It needs a second conversation with the same toolchain, and
somewhere to show what comes back.

## Server contract: yes, it changes

The client cannot grow this capability alone. The toolchain must serve its
operations conversation over standard streams, and must offer a way to play a
held machine that answers with an address a web view can be pointed at. Both are
proposed in the `basically` repository as `play-a-machine-from-another-app`,
against its `machine-play` and `headless-cli` capabilities. Nothing designed
here asks the server for anything beyond what that change offers, and none of it
can be implemented before that ships.

## Goals / Non-Goals

**Goals:**

- Running a listing and playing its machine without leaving the editor, on the
  machine the listing is already checked against.
- A machine that belongs to this editor window, so the user's terminal and this
  panel never contend for one.
- Saying what cannot be done, with the remedy, before the user hits it —
  covering both the machine the bundled server cannot boot and the ROM that has
  not been agreed to.
- Reusing the resolution, the runtime choice and the ask-the-server habit the
  client already has, rather than growing a second set of rules beside them.

**Non-Goals:**

Sound, the other clients, editing in the panel, debugging, and replacing the
browser IDE. The proposal lists these; none is revisited here.

## Decisions

### A second conversation with the same toolchain, resolved the same way

**Decision.** The client starts a second long-lived child process speaking the
toolchain's operations conversation over its standard streams, alongside the
language client. Where that server is and what runs it comes from the existing
resolution, asked for a different operation — the module already takes the
operation as an argument for exactly this reason.

**Why.** A machine held over a connection is let go when that connection ends,
which is precisely the lifetime a panel wants. Resolving separately, or
resolving once and remembering, would let the two conversations drift onto
different servers after a settings change; asking the same module the same way
keeps them together, and keeps the READMEs' three chains true of both.

**Alternatives considered.** *Run the toolchain once per request* — no long-lived
process to manage, but the command line's session is deliberately shared across
its connections so a machine survives between commands, which means the panel
would hold the same machine as the user's terminal and each would surprise the
other. *Speak the agent's protocol* — exists today and needs no toolchain
change, but it is an agent's framing for a caller that is not one, and it would
have made this client depend on a conversation shaped for something else.

### The framing lives in `src/`, and the test drives it

**Decision.** The `Content-Length`-framed JSON client moves into the extension's
own source and is used by both the extension and the tests, rather than the
tests keeping a second implementation of the same framing.

**Why.** The check that matters in this repo holds a real conversation with the
server the extension would really start, and it catches a client and a server
that have parted company. That only works if the test drives the code that
ships. A test-only framing implementation would pass while the shipped one was
broken, which is the exact failure the existing arrangement was built to avoid.

### The panel shows the toolchain's own page, and adds nothing

**Decision.** The panel is a thin shell around a frame pointed at the address the
toolchain gives back. The client does not draw the machine, does not translate
keys, and does not interpret what crosses that frame. The address is passed
through the editor's external-URI mapping so that it also works where the
extension runs on one machine and the editor's window is on another.

**Why.** The toolchain's contract is a URL to put in a frame, and how the picture
and the keys are carried is explicitly private to it and may change. A client
that reached inside that would break on a toolchain release that changed
something it was never promised. Passing the address through the editor's own
mapping is the only way remote development works at all, and it costs nothing
when everything is local.

**Alternatives considered.** *Draw the machine in the panel from frames the
client fetches* — would put the emulator's display handling into this repo,
where nothing else about a machine lives, and would need the toolchain to
promise a frame format it has deliberately not promised.

### The client asks the server what it can run; it never carries the answer

**Decision.** Whether a machine can be run is a question put to the resolved
server, not knowledge the client holds. The client asks, and reports what it is
told — which machine cannot be booted here, or which ROM has not been obtained —
naming the remedy.

**Why.** The client already chooses machines this way, and the reason given there
holds here: asking rather than carrying a list means the answer can never be a
machine the server does not have or miss one it gained. The specific limit that
prompts this — the emulator dependency the packaged client deliberately does not
carry — is a fact about a particular server copy, not about the client, and a
client that hard-coded it would be wrong the moment a user pointed at their own
toolchain install.

### Agreement to obtain a ROM is asked for by the client, once

**Decision.** Where a machine needs a ROM that has not been obtained, the client
asks the user, and on agreement records it through the toolchain's own
agree-in-advance path rather than passing a flag with each request. Declining
leaves the user exactly where they were, and the panel says what was declined
and how to change it.

**Why.** The toolchain will not block a caller it cannot ask, and it names an
editor as exactly such a caller — so the client that *can* ask is the one that
has to. Recording the agreement once rather than re-asserting it per request
means the user is asked once, which is what the toolchain guarantees a person at
a terminal.

### The panel runs what is in the editor, not what is on disk

**Decision.** The listing sent to the toolchain is the editor's current text,
unsaved changes included, and the client resolves any path itself before
sending.

**Why.** The language server already sees the buffer rather than the file, so a
listing with no problems in the editor would otherwise refuse to run, or run
something else, for reasons the user could not see. It also matches how the
toolchain expects to be asked: everything about the caller's files is settled by
the caller, and a host never resolves a location relative to wherever it happens
to be running.

### One machine per panel, released when the panel closes

**Decision.** A panel holds one machine for as long as it is open. Closing it
closes the conversation, which lets the machine go. The client releases politely
on close and relies on the disconnect for every other way a panel can end.

**Why.** The toolchain already guarantees that a machine is let go when the
caller holding it disconnects or disappears, so the crash case needs no code
here — only the tidy case does. Anything more would be the client reimplementing
a guarantee it already has.

## Risks / Trade-offs

- **Nothing here can be built or tested against a published server** → The
  toolchain change will not have shipped when this work starts. Mitigated by the
  existing override that points the tests at a toolchain checkout; the pinned
  version moves in its single place only once a release carries what this needs,
  and until then a green run means green against a checkout and must be reported
  that way rather than as a release-ready result.
- **Remote development may not carry the frame** → Where the extension runs
  remotely and the window is local, the address is on the wrong side. The
  editor's external-URI mapping is designed for this, but it is the one
  assumption in this design that would invalidate the whole panel if it did not
  hold. Verify it against a remote workspace before the panel is built out, not
  after.
- **The editor may swallow the machine's keys, or the machine the editor's** →
  A frame taking raw keystrokes sits inside an application with its own
  keybindings. Some chords will not reach the machine. Mitigated by saying which,
  where the panel is documented, rather than fighting the editor for them.
- **The panel's address admits acting on a machine** → The toolchain protects it
  by possession alone and says so; a client that repeats that sentence loosely
  understates it. The READMEs must say, in the client's own words, that whoever
  holds the address can type at the machine, not merely watch it.
- **Two long-lived child processes per window** → The client now starts a second
  toolchain process, and a user with several windows has several. Mitigated by
  starting it only when a panel is opened rather than at activation, so a user
  who never runs a listing pays nothing.
- **The bundled server's limits become user-visible** → What was an internal
  property of the fetch script is now something a user meets. Stated as a
  trade-off rather than a risk: it is the honest consequence of shipping a
  client that does not carry half a gigabyte, and the remedy — pointing at a
  toolchain install of one's own — is one the client already supports.

## Open Questions

- Whether one panel per listing or one panel per window is the better default
  when a user runs a second listing while a panel is open. Replacing what is in
  the panel is simpler and matches the toolchain holding one machine per caller;
  a second panel is what a user with two listings may expect.
- Whether the command should be offered where a listing cannot be run at all —
  hidden, or shown and explaining itself when used. Showing it is usually kinder,
  but a command that is always visible and usually refuses is its own complaint.
