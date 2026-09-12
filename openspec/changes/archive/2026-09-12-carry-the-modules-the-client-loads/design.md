## Context

The compiled client is CommonJS, and its entry point asks for one module that
is not Node's and not the editor's: the language client library it speaks LSP
through. Everything else it asks for is a Node builtin, the editor's own
injected module, or a sibling file of its own.

Inside this repository that one module is always findable, because
`clients/*` is a workspace glob: the module is installed at the repository root
and the client sits two directories below it, so Node's upward walk finds it
from the source tree, from the compiled output, from the suite, and from the
editor running the client under its debugger. Every way the client is exercised
here works, and none of them is the way it ships.

What ships is a directory the editor unpacks on its own, with nothing above it.
The upward walk ends immediately, the module is not there, and the editor's
attempt to load the entry point throws before the client's first line. The
editor treats that as the extension failing to activate — which it is — and the
commands the client would have registered do not exist, while the manifest goes
on offering them.

`CLAUDE.md` and the READMEs describe the three precedence chains and the
conventions; neither is restated here.

## Server contract: no, it does not change

Nothing here asks the server for anything, and no matching change is needed in
the `basically` repository. This is the client reaching the point where it can
start the server at all.

## Goals / Non-Goals

**Goals:**

- An installed client that loads, with nothing present but what was installed.
- What ships carrying the modules that were resolved and tested, not a second
  resolution of the same request at packaging time.
- The licence of every carried module travelling with it.
- The client run under the editor's debugger loading the same copy that ships,
  so the loop a person develops in cannot pass while the artefact is wrong.
- A build that fails rather than producing a package that could not have run.

**Non-Goals:**

- A bundler. See the proposal's non-goals for why the licence notices settle it.
- Any opinion on how the workspace arranges its modules while being worked in.
- Carrying anything a carried module does not need at runtime.

## Decisions

### Where the modules go: beside the compiled output, not at the package root

The obvious place is a `node_modules` at the root of the client, which is where
npm would put it and where Node would look second. It cannot be used, and the
reason is worth recording because it is not discoverable from the outside: the
packager collects the files it will ship by globbing the client's directory with
its own fixed exclusion of `node_modules` at that root, and the ignore file's
re-inclusions filter that collection rather than adding to it. A directory that
was never a candidate cannot be re-included. Modules placed there are simply not
in the package, and no ignore-file line can put them there.

Placing them beside the compiled output instead sidesteps this exactly, because
the packager's exclusion and the ignore file's own are both anchored at the
client's root and neither matches a path one directory down. It is also the
*first* place Node looks from the compiled entry point, so it takes precedence
over anything that might be found above — which is the property that makes the
debugger loop and the shipped package agree. And the existing clean target
already removes the compiled output wholesale, so it is removed for free.

### Where they come from: the resolution this repository already made

The modules are copied out of the tree the repository's own install produced,
not fetched. Fetching would re-answer a version range at build time, so what
shipped could differ from what the suite ran against — the very thing the single
pinned server version exists to prevent, arrived at from the other direction.
Copying also means the step needs no registry, which matters because the step
runs as part of compiling.

The carried set is worked out by walking the dependency declarations and, for
each name, walking `node_modules` directories upward from the asking package the
way Node does. Doing it that way rather than reading the top of the tree is not
fussiness: the module the client asks for has two of its own modules installed
underneath it, at versions that differ from the same names at the top of the
tree, and a copier that flattened to the top would carry the wrong ones. Where
two packages in the carried set want the same name at different versions, the
second is carried underneath the package that wants it, which is npm's own rule
and Node's own resolution.

`require.resolve` is not used for this. One of the carried packages declares its
entry points in a way that deliberately does not expose its own manifest, and
asking the resolver for that manifest throws. The upward walk has no such
problem and is what the runtime does anyway.

### Why the step runs when the client is compiled

It could run only when the client is packaged, which is where the equivalent
step for the server runs. Running it at compile time instead does three things
that packaging time does not. The compiled output becomes self-sufficient, so
the new check can be part of the ordinary suite — which runs before packaging.
The client under the editor's debugger resolves through the carried copy, so the
development loop and the shipped package load the same files. And packaging
already compiles, so packaging gets it anyway with nothing further wired up.

Type-checking is unaffected: the compiler is pointed at the source tree and does
not descend into its own output, and resolution for the source starts at the
source and walks up.

### What the check actually checks, and how it avoids lying

The temptation is to assert that a particular module is present, which would
have caught this bug and nothing else. What is asserted instead is the general
property: standing up exactly what the packager says it will ship, in a place
with nothing above it, every module the entry point asks for — and every module
*those* ask for, transitively — resolves, and resolves from inside the package.

Two details make that honest rather than approximate. The file list comes from
the packager's own collector rather than from a list assembled here, so what is
checked is what will be shipped; the collector is pure, needs no network, and
does not compile anything. And the resolution is done by the runtime's own
resolver from inside a copy that has nothing above it, so a module that would
only have been found by the upward walk out of the package cannot be mistaken
for one that is carried. That second point is the whole reason the check is not
simply run against the client's own directory, where everything resolves.

The modules each file asks for are read out of the text, which is sound because
the compiler emits them as plain strings and no carried module computes one. A
carried module that some day does would be under-reported rather than
over-reported: the check can miss a new failure, and cannot invent one.

The carried server is not walked. It is launched as a program by path and never
loaded as a module, and walking it would mean walking an emulator. That it is
carried at all, with its entry point and its licence, is asserted directly, as
it already was at the point it is unpacked.

### The licence gate

Every module carried is asserted to bring a licence file. This is the same
conclusion the packaging specification already reached about the server, and the
reason is the same: what is being redistributed is somebody else's program under
terms that require the notice to travel with it. The gate is at both ends — the
step refuses to carry a module without one, and the check refuses to ship a
package missing one — because the two catch different mistakes: a module whose
licence is named unusually, and a change to what the package collects.

### A trap removed from the ignore file

The ignore file re-includes type declarations from the compiled output. Nothing
emits any, so the line does nothing today; once modules are carried beside that
output it would match theirs and re-include every one of them. It is deleted
rather than narrowed, because a line that is dead in one direction and harmful
in the other has no reading under which it should stay.
