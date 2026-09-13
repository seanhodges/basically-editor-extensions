## Context

See `proposal.md` — Why. The load-bearing facts for the approach:

**The server contract does not change.** `basically mcp --stdio` is an existing
operation of the toolchain, published in the pinned version, taking the same
flags `basically lsp --stdio` takes. No matching change is needed in the
`basically` repository.

**The editor starts the server, not the client.** VS Code's registration API
takes a description — a command, its arguments, an environment overlay, a working
directory and a version — and the editor spawns, restarts and stops the process
itself. The extension holds no MCP conversation, frames no message, and needs no
new dependency.

**The resolution already exists.** `src/server.ts` answers which server and what
runs it, and four callers already consume it (the language client, the status
item, the panel with the debug adapter behind it, and the ROM query). This adds a
fifth in the same shape; `executableFor` in `src/extension.ts` is the worked
example, differing only in the operation name.

**Registering a provider widens activation.** The editor derives an activation
event from the contribution, and it fires when a chat message is submitted —
including in a window holding no listing. The README for the extension and
`CLAUDE.md` both describe activation as a consequence of opening a listing, and
today activation starts the language server unconditionally.

## Goals / Non-Goals

**Goals:**

- One description of the server, derived from the same `ServerLaunch` every other
  conversation is derived from, so the three precedence chains stay one set of
  rules rather than two.
- The agreement to obtain ROM images asked in one place, whichever caller needs
  it, so the panel and the agent cannot drift into asking differently.
- Activation cheap enough that the widened activation costs a user nothing.

**Non-Goals:**

- Any change to `src/framing.ts`. The agent's protocol frames its messages by
  line; the language server's frames them by length. Sharing the reader would
  mean making it do two things badly.
- Any client-side account of what the toolchain offers an agent. There is nothing
  to check two ways here, because the editor holds that list, not the client.

## Decisions

### The environment is an overlay, not an environment

`envFor(launch)` answers "what environment does a spawn need" with a whole copy
of `process.env`. The editor's registration takes the opposite thing: what to add
to the environment it will use. Handing it `envFor`'s answer would push every
variable the editor happens to hold into its own configuration.

So `envOverlayFor(launch)` is added beside it, returning what the launch adds and
nothing more, and `envFor` is reduced to spreading it over `process.env`. That
keeps the reason the overlay exists — the editor's own executable serves only
when told to run as Node — stated once.

Alternative considered: building the overlay inside the new module. Rejected —
it would put a fact about the runtime chain outside the module that owns the
runtime chain, and outside what the tests reach.

### The version tells the editor when to start over

The editor restarts the server and asks it again what it offers when the
description's version changes, and at no other time. The pinned server version
would be the obvious value, and is wrong: it stops being true the moment a user
points the client at a server of their own, so pointing at a checkout would leave
the editor holding the copy it had already started.

The version is therefore derived from what will actually run — the pin when the
copy that shipped with the client was the one located, and otherwise a digest of
the command and its arguments. Changing which server or which runtime is used
changes it; nothing else does.

Alternative considered: a counter bumped whenever a setting changes. Rejected —
it would restart the agent's server for a setting that does not bear on it, and
would not survive a window being reopened.

### Settings are read through the first folder's view

Which machine a listing is checked against is a per-folder setting, and which
server to use is per-computer; but a server offered to an agent belongs to the
window, not to a document. The panel already faces the narrower version of this
and answers it by reading settings through the document's own view.

The nearest true thing for a window is the first workspace folder's view, falling
back to the user's own where there is no folder. A window whose folders disagree
about which server to use is a case this does not try to serve; the alternative —
one server per folder — would offer an agent several toolchains and no way to say
which it is talking to.

### The machine is passed as the toolchain's own bottom layer

The toolchain settles which machine a request is for by taking the request's own
answer first, then the listing's `#MACHINE` declaration, then what the server was
started with. Passing the configured machine as what the server is started with
therefore lands exactly at the bottom of that chain, which is the same shape this
repository already states for which machine a listing is for. Nothing has to be
re-implemented for it to hold.

### The agreement moves out of the panel, the decline does not

Two callers now need the ROM agreement asked, and only one of them has a panel to
say things in. The question, and recording the answer through the toolchain's own
agree-in-advance path, move to a module of their own; what a decline means stays
with each caller, because it means different things — a listing that will not run
in one case, and a toolchain still worth offering in the other.

### Activation waits for a listing

The language client starts on the first listing opened rather than on activation,
guarded so that a burst of opened documents starts one server. Restarting the
server stays unconditional: the user asking for it explicitly is the case the
existing "Restarting after installing the toolchain" scenario turns on.

The status item and the debug registration are untouched. Both are already
documented as independent of whether the language server starts, and both resolve
their own launch — which is what makes this a change to one thing rather than
three.

Alternative considered: declaring the extension should be activated at startup so
the provider is always registered. Rejected — it is the opposite of what is
wanted here: it would load the extension in every window whether or not the agent
was ever asked anything.

## Risks / Trade-offs

- **The editor version asked for goes up** → An editor older than the one the
  registration API arrived in keeps the last version of the extension that
  supported it, rather than breaking. The API cannot be reached from the older
  types at all, and reaching it through a hand-written interface would leave a
  branch neither the type checker nor the tests could see.

- **The widened activation loads the extension in unrelated windows** → This is
  the editor's behaviour, not something the client can decline. Making the
  language server wait for a listing is what makes it cost nothing; the check is
  to watch for the process rather than to read the code.

- **A question on the chat path** → The agreement is asked when the server is
  about to start, which may be a user's first chat message. It is asked once —
  the answer is recorded through the toolchain — and only when the server is
  genuinely being started rather than merely described.

- **Two machines, not one** → The panel holds a machine over its own conversation
  and the agent's server holds its own, in a process the editor started. They do
  not collide, and neither is a view of the other. The READMEs must not imply the
  agent sees what the panel shows.

- **The editor's own runtime, two processes down** → Where the runtime settled on
  is the editor's own executable, the toolchain re-spawns its host using the
  runtime it is itself running under, carrying the environment it was given. That
  is the path the language server already takes, so it should hold — but it is
  worth seeing, because here the editor rather than the client is the one
  spawning.

## Migration Plan

None. Nothing is removed, no setting is renamed, and a user who never asks their
agent anything sees no change beyond a language server that starts on their first
listing rather than a moment earlier.
