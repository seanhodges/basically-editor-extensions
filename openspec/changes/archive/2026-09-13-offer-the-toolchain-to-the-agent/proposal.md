## Why

The toolchain the extension already carries can serve an agent. `basically mcp
--stdio` is one of its operations, published in every version of `@ba.sical.ly/cli`
including the pinned one, and it offers an agent the same things the panel and the
debugger use: run a program and leave the machine up, look at the screen, press
keys, lint, build, profile, set breakpoints and step.

Nothing reaches it from VS Code. A user with the extension installed has the
language help, the panel and the debugger, but the editor's own agent knows
nothing about the toolchain sitting inside the extension — and the only way to
tell it is by hand, naming a command and a path inside an extension directory the
user has no reason to have seen. The editor has an API for exactly this, so the
extension can say where its toolchain is and let the editor start it.

## What Changes

- The extension offers the toolchain to the editor's own agent, naming the same
  server that serves the language, started by the same runtime. The editor
  starts and stops it; the extension only says where it is.
- Where the machines an agent might run need ROM images and the user has not yet
  agreed to obtain them, the extension asks — as it already does before running a
  listing in the panel. The toolchain cannot ask for itself, because it is being
  started by an editor rather than at a terminal. Declining is not a failure.
- A new setting says whether the toolchain is offered to the agent at all.
- The language server now starts when the first listing is open rather than
  whenever the extension is activated. Offering the toolchain to an agent means
  the editor may activate the extension in a window that holds no listing, and
  starting a language server for a user who has opened no BASIC is nothing but a
  process they did not ask for.
- **BREAKING** (for the user's editor, not for their listings): the extension now
  asks for a newer VS Code than it did, because the API for offering a server to
  the agent is newer than the one the extension was written against. An editor
  older than that keeps the last version that supported it.

## Capabilities

### New Capabilities

None. Offering the toolchain to the agent is something the VS Code client does,
and which server it offers is the same question `server-resolution` already
answers.

### Modified Capabilities

- `vscode-client`: gains the guarantee that the toolchain is offered to the
  editor's own agent and can be turned off; the settings a user is offered gain
  that one; and being served is now tied to having a listing open rather than to
  the extension being loaded.
- `server-resolution`: gains the guarantee that the agent is served from the same
  server as the language, found in the same order and run by the same runtime —
  so that a user who pointed the client at a server of their own does not find
  their agent talking to a different one.

## Non-goals

- **Serving an agent from any other client.** Only the VS Code client is
  affected. Neovim's LSP host has no equivalent registration, and the Notepad++
  notes describe an LSP integration that has no agent to offer anything to.
  Neither needs to follow.
- **Adding anything to the toolchain.** The `mcp` operation exists, is published
  in the pinned version, and needs no change; this proposal names no work in the
  `basically` repository.
- **Choosing, filtering or renaming the tools the agent gets.** What the
  toolchain offers an agent is the toolchain's to decide. The client says where
  the server is and nothing about what it can do.
- **Holding the agent's machine, or showing it.** The editor starts that server
  and the toolchain holds the machine against it. The panel's machine and the
  agent's are two machines, and neither becomes a view of the other here.
- **Obtaining ROM images the user has not agreed to.** The agreement is asked
  for and recorded through the toolchain's own path, exactly as the panel does;
  nothing is downloaded on a decline.

## Impact

- `clients/vscode/package.json` — the editor version asked for, the provider
  contribution, and a fifth setting.
- `clients/vscode/src/` — a module that describes the server to the editor, a
  module holding the ROM agreement now that two callers ask it, a narrower view
  of the environment a launch needs, and activation that waits for a listing.
- `clients/vscode/test/` — the client-against-server check gains the agent's
  conversation, over a second hand-rolled client: the agent's protocol frames its
  messages differently from the language server's.
- No new dependency. The editor is the one speaking the protocol; the extension
  only names the command.
- The READMEs and `CLAUDE.md`, which describe the client as starting two
  conversations with the toolchain and now describe three.
