## Context

The client already holds two conversations with the toolchain and frames one
address. CLAUDE.md and the READMEs describe both; nothing here restates them.
What matters for this change is the shape they already set:

- The panel frames an address the toolchain gives it, in a webview whose content
  policy names that origin and nothing else, and holds none of the client's own
  script inside it.
- A live view of the machine decides what it shows in a module free of the
  `vscode` module, so a plain Node test can drive every state it can reach with
  no editor and no server. The view is a thin companion that registers it and
  paces it.
- Something that only reads the machine never brings a toolchain process into
  being: it asks the panel for the conversation it is already holding, and shows
  its nothing-yet state when there is none.

**The server contract changes, and the change is not here.** No operation of the
toolchain projects a memory map today. `watch-a-machines-memory` in the
`basically` repository adds one, as a third projection beside the display view
and the play channel, and this change rests on it and cannot ship before a
release carries it. Until then the map can only be driven against a toolchain
checkout, which is what `BASICALLY_SERVER_PATH` is for.

## Goals / Non-Goals

**Goals:**

- A memory map of this window's machine, in a place the user can dock where they
  work, following the machine while it is played and while it is stepped.
- A client that names an address and frames it, and keeps no account of what is
  drawn there.
- Every state the user can reach said as something, including each way a machine
  or a server can decline.

**Non-Goals:**

- Drawing the map, or knowing anything about how it is drawn.
- Reading or writing what an address holds.
- Any change to the panel, the variables view, or the editor's own debug panes.

## Decisions

### The map is framed, not drawn

What is at the map's address is the toolchain's page, exactly as the panel's
picture is. The client resolves the address for the editor's outer window,
frames it under a policy naming that origin and nothing else, and puts nothing
of its own inside the frame.

This is the whole reason the server change is a projection rather than an
operation answering data. A client that drew the map would have to carry a
renderer, a layout, and a set of colours that would then have to be kept in step
with the browser IDE's by hand, in a repository whose stated job is to start the
right server and speak to it.

**Alternative considered:** an operation answering the layout and the activity,
drawn by the client as a tree or a canvas. Rejected on the above, and because a
tree of regions is not a map - the proportions are the information.

### A dockable view, not a second panel

The panel occupies the column beside the listing and is where the machine's
screen is. A second full panel would compete with it for that column, and a user
watching a program run wants both at once.

So the map is a view, registered the way the variables view is, and the user
docks it where they like. A memory map is tall and narrow, which is the shape a
side or panel dock gives it.

### The map's address admits less than the panel's, and the client says so twice

The panel's address lets whoever holds it type at the machine, and the client is
required to say that in its own words rather than by reference to any weaker
claim made elsewhere - precisely so a reader cannot carry a weaker claim across
to it.

There are now two addresses, and the second one is the weaker case. So the same
discipline runs the other way: the map's address admits watching the machine's
memory and nothing else, said in the client's own words, and neither statement
may be read as describing the other. Getting this wrong in either direction
mis-states what handing someone a link does.

### Reading follows the machine, and never starts one

The view asks the panel for the conversation it is already holding, never for
one to be started. A map is something that watches a machine that exists; a
client that started a toolchain process to show an empty map would be spending
the user's machine on a question nobody asked.

When the panel holds nothing, the view says what to do to get a machine, and the
editor's own welcome is what the user sees rather than an empty frame.

### A refusal is a state, not a failure

Every way this can decline is a thing the user is told, in a place they are
already looking:

- the server being used has no map to project (the pin lags the release, or the
  user has pointed the client at an older toolchain);
- the machine's layout is not described, so there is no map;
- the machine cannot report what it is touching, so the map draws but stays
  dark;
- this window is holding no machine.

The first and the last are the client's to say. The middle two are the server's
account, and the client says what it was told rather than working it out - the
same rule that governs what the client says about variables. A client that
refused to show anything over a version number would leave the user with a
working editor and no explanation, which is the thing this repository has said
it will not do.

### A debug session tells one more thing where it already tells one

A session reports that its program moved, and what it reports to is none of its
business - that narrowness is what lets the debug registration be independent of
whether any particular view was registered. A second view that wants the same
news needs that reporting to reach more than one listener.

So the thing a session reports through becomes something that can be told to
more than one, rather than the map reaching into the session or the session
learning about the map. This is a small widening at a seam that was written to
be widened.

## Risks / Trade-offs

- **The pin lags the server change.** → The view says so, in its own words, and
  the rest of the client is unaffected. The pin moves in one place when a
  release carries it.

- **Two frames onto one machine.** The panel frames the play address and the map
  frames its own; both are served by the same host and both go when the machine
  does. → The map is not a display and does not displace one: that is stated by
  the server change and is what makes two frames legitimate rather than a race.

- **A view nobody is looking at.** → It is paced the way the variables view is:
  a background tab is nobody looking, and what the toolchain is asked for
  follows that.

- **The user may read the map's address as admitting what the panel's admits.**
  → The two statements are made separately and each in the client's own words,
  which is the mitigation the panel's own requirement already chose for the
  stronger direction.
