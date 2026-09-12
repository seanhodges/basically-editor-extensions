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
held machine that answers with an address a web view can be pointed at. Both
came from `play-a-machine-from-another-app` in the `basically` repository,
against its `machine-play` and `headless-cli` capabilities, and both are served
by `@ba.sical.ly/cli` from 0.1.5. Nothing designed here asks the server for
anything beyond them.

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

### The emulator travels with the server

**Decision.** The build carries the emulator the toolchain reaches for beside
the toolchain itself — that package's own files, never its tree, at the version
the toolchain's own manifest asks for. No ROM image is fetched or held by the
build; the images that travel are the ones inside that emulator's own package,
which are the ones the toolchain already reports as needing no agreement.

**Why.** The toolchain asks Node where the emulator is before it runs anything
at all, so a copy without it runs no machine whatsoever — not even the machines
whose emulation is in the toolchain's own files. Carrying it is what makes the
panel work on a bare install, and its own files come to a fraction of the tree
the packaging rule exists to keep out.

**Alternatives considered.** *Carry the toolchain alone and report the failure* —
honest, but leaves the whole of this change dead for anyone who has not
installed the toolchain themselves, which is most users of a released client.
*Carry the emulator but strip the images inside it* — measured, and rejected:
the toolchain goes on reporting those machines as runnable and then fails on a
missing file, so the client could no longer tell a user in advance what it
could run. The agreement the images need is asked for where one is actually
needed, which is every other machine.

### One machine per panel, released when the panel closes

**Decision.** A panel holds one machine for as long as it is open. Closing it
closes the conversation, which lets the machine go. The client releases politely
on close and relies on the disconnect for every other way a panel can end.

**Why.** The toolchain already guarantees that a machine is let go when the
caller holding it disconnects or disappears, so the crash case needs no code
here — only the tidy case does. Anything more would be the client reimplementing
a guarantee it already has.

## Risks / Trade-offs

- **The pin has to move before any of this can be tested** → The server the
  client pins today serves neither the operations conversation over streams nor
  playing, so a suite run before the pin moves proves nothing about this work.
  Mitigated by the pin being one edit in one place, and by the existing override
  that points the tests at a toolchain checkout for anything not yet released.
  A run against a server that predates 0.1.5 must be reported as not having
  exercised this at all, rather than as a pass.
- **Remote development may not carry the frame** → Where the extension runs
  remotely and the window is local, the address is on the wrong side. The
  editor's external-URI mapping is designed for this, but it is the one
  assumption in this design that would invalidate the whole panel if it did not
  hold. Verify it against a remote workspace before the panel is built out, not
  after. **Still to be verified by hand, and now the only part that is.** A
  hands-on run has shown the frame carrying the machine's own display and taking
  keys, under content rules that allow the origin `asExternalUri` gives back and
  nothing else — but that run had the window and the extension on one machine,
  where the mapping is asked for nothing. The remote leg stands on the documented
  contract: the address goes through `vscode.env.asExternalUri`, and the
  webview's content rules name the origin that comes back rather than the one
  that went in, so a mapped address is the one allowed in the frame.
- **The editor may swallow the machine's keys, or the machine the editor's** →
  A frame taking raw keystrokes sits inside an application with its own
  keybindings. Some chords will not reach the machine. Mitigated by saying which,
  where the panel is documented, rather than fighting the editor for them — and
  the hands-on run saw none taken on the way, so what is documented is the rule
  rather than a list: the workbench claims what the user has bound there, which
  is the only thing that stays true of somebody else's keybindings.
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

### One panel to a window, and the command explains itself

**Decision.** A window has one panel. Running a second listing plays it on that
panel, letting the machine the previous run left go first. The command is
offered wherever a listing is being edited, and where a listing cannot be run
the panel says why rather than the command being absent.

**Why.** A panel is a machine, and a machine is a connection: one panel per
listing would be one toolchain process per listing, so a user who ran three
would be holding three machines without having asked to. Showing the command and
letting it explain itself is what the client already does everywhere else it
cannot do something — it says what is wrong and names the remedy — and a command
that quietly disappears leaves a user with nothing to read.

## Open Questions

- Which machine a listing is for cannot be *inferred* over the operations
  conversation. The toolchain settles a machine there from the listing's own
  declaration or from one passed in, and refuses where neither answers; the
  inference the language server does is not reachable from any request the
  client can make. So the panel settles a machine by the first two of the three
  chains and says what to set where neither answers — which is what the spec
  requires of the un-settleable case, but reaches it for some listings the
  editor can nonetheless colour. Closing this needs the `basically` repository
  to offer the inference to a caller.
