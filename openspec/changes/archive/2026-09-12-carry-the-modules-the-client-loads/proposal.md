## Why

The released VS Code client does not load. Not "loads and cannot find the
server", not "loads and serves nothing" — does not load. Its compiled entry
point asks for a module the package does not carry, the editor's attempt to load
it fails before a line of the client runs, and the user is left with an
extension that installed perfectly and does nothing at all.

What that looks like from the user's chair is two unrelated-seeming faults. The
commands are registered by the client as it activates, so with no activation
there are no commands, and the editor answers the one they picked from the
palette with "command not found" — having offered it a moment earlier, because
what the palette offers is read from the manifest and needs no code. And the
language server is never started, so none of the server's colour arrives; a
listing shows only the bracket matching that comes free with the manifest's
account of how BASIC is written. One failure, two symptoms, neither of which
names the cause.

Nothing here would have caught it. The suite drives a real conversation with a
real server and is the right check for a client and a server that have parted
company, but it drives the client's modules from inside this repository, where
everything the client asks for is present because it is a workspace here. What
ships is a different arrangement, and no check looks at it. The build produced a
package, the package installed, and the first thing to notice was a person.

So the hole is not only the missing module. It is that a client can be packaged
without the thing it loads and nothing says so until a user says so.

## What Changes

- **A released client carries the modules its own compiled entry point loads**,
  beside that entry point, so loading it needs nothing present but the package
  itself. This is the same guarantee already made about the server, extended to
  the client: a user who installs one thing has one working thing.
- **What is carried is what was resolved and tested**, not a fresh answer to the
  same question. The modules travel at the versions this repository's own
  resolution settled on, so the copy that ships is the copy the suite ran
  against.
- **A carried module brings its licence.** The client's modules are other
  people's work under their own terms, and redistributing them without their
  notices is not something a build should do quietly. The `.vsix` already may
  not ship the server without its licence; the same now holds for everything
  else it carries.
- **A package whose entry point cannot be loaded fails the build.** The check
  reads what the packager will actually put in the package, stands it up with
  nothing around it, and asks the runtime — not a rule written alongside — to
  resolve every module it asks for. A package that could not have run is not a
  package to be uploaded.
- **A package carrying source, tests or build configuration fails the build.**
  The specification has said this for as long as it has existed and nothing has
  ever looked; now something does.
- Only the **VS Code client** is affected. The Vim client is registered with
  whichever LSP host is present and is not packaged by npm at all; the
  Notepad++ notes describe a route with no build yet. Neither needs to follow.
- No behaviour the user asked for changes, and nothing is removed. **Not
  breaking** — though it is worth being plain that what it restores was never
  working, so there is no release of this client that this makes worse.

**The server contract does not change.** Nothing here asks the server to answer
anything new, and no matching change is needed in the `basically` repository.
What the client says to the server, and how, is exactly as it was; the change is
that the client now gets far enough to say it.

## Capabilities

### Modified Capabilities

- `client-packaging`: The account of what a released client carries is about the
  server, throughout — carried within it, at the version named in one place,
  with its licence, failing the build where it unpacked without an entry point.
  It never says that the client carries what the *client* loads, and the gap is
  precisely where this bug lived: every guarantee made was kept, and the package
  still could not run. A requirement is added for the modules the client itself
  loads, and the requirement about a build failing is widened from the carried
  server to everything carried.

`vscode-client` is deliberately absent. Its account of the commands, the
settings and the colour is correct and unchanged; the client this change
produces is the client that account already describes. A specification that says
what a client guarantees has no business also saying that the client is reachable
at all — that is packaging's, and packaging is where it is now stated.

`server-resolution` is likewise absent. Which server is started, and with which
runtime, is decided by code that was never reached and is not touched.

## Non-goals

- **Bundling the client into one file.** A bundler would answer the same
  question and is what the editor's own documentation recommends, but every one
  of the carried modules keeps its licence notice in a file of its own and none
  of them carries it inline, so a bundle discards all of them and needs a
  generated notices file and a check for that instead. That is this change's
  script doing less, with a build step that can silently disagree with the
  compiled output the suite reasons about. Carrying the modules keeps the
  attribution by construction.
- **Making the workspace's own layout the package's problem.** How this
  repository arranges its modules while it is being worked in is npm's business
  and changes with npm. What ships is settled by the build, deliberately, so
  that it cannot drift when a tool's defaults move.
- **Shipping the modules' own sources, tests, or type declarations.** What is
  carried is what is loaded, plus the licence that has to travel with it.
- **Reviewing which modules the client depends on.** The client asks for one
  thing and will go on asking for it. What that pulls in is not this change's to
  argue with.
- **Reporting the failure better.** There is nothing left to report: the client
  cannot report anything before it loads, and once it loads there is nothing to
  report. The remedy is the check, on this side of a release.
- **The Vim and Notepad++ clients.** Neither is packaged by npm and neither
  loads a module.

## Impact

- **The VS Code client** gains a build step that puts the modules it loads
  beside its compiled output, and its packaging stops depending on the accident
  that those modules happen to be findable from wherever the client sits. The
  step runs as part of compiling rather than only as part of packaging, so that
  the client run under the debugger loads the copy that ships rather than the
  workspace's — the divergence that let this reach a user in the first place.
- **The tests** gain their second kind of check. The existing suite is a client
  against a server; this is a package against itself, and it needs no editor, no
  server and no network. It belongs beside the other rather than inside it,
  because it answers a question about what ships rather than about whether two
  programs still agree.
- **What ships** grows by the modules the client loads, which is a small
  fraction of what the carried emulator already is, and gains their licences.
- **The READMEs** need a line on what a released client carries, which until now
  has been "the server" and is now "the server, and what the client loads".
- **Releases before this one** are all broken in the same way and are not worth
  re-cutting; the next one carries the fix.
