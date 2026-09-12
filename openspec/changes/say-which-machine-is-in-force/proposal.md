## Why

The server colours nothing in a listing it cannot bind to a machine. That is
right — a name is a keyword on one machine and an ordinary variable on another,
and colouring it as either would be a guess dressed up as an answer — but it
means the correct behaviour and a broken client look exactly alike. An
uncoloured listing is what a user sees when the machine could not be settled,
and it is also what they see when the extension failed to load, when the server
could not be started, and when the runtime that was found could not run it.

This is not hypothetical. A packaging fault that stopped the client loading at
all was reported as "only the brackets are coloured", because that is genuinely
all there was to go on. The problem on the listing does say what to set, and
that requirement is already in `machine-selection` and already kept — but a
problem is one line in a panel the user may not have open, it is attached to a
listing rather than to the state of the editor, and it says what is wrong
without ever saying what is right. A user whose listings *are* being checked has
nothing at all telling them against what.

So the gap is the ordinary case, not the failure. Every other language in the
editor says what it is doing with the file in front of you. This one does not
say which of twenty-six machines it settled on, and the only way to find out is
to read a problem that appears when it did not settle on any.

## What Changes

- **The machine a listing is being checked against is shown where the user is
  already looking**, for the listing they are editing, and updated as they move
  between listings and as the answer changes.
- **Where no machine could be settled, that is shown as plainly as a machine
  would be**, so the difference between "checked against the ZX81" and "no
  machine settled" is visible without opening anything. The remedy stays where
  it already is — the server's problem on the listing — rather than being said
  twice in different words.
- **Where the machine was named but this server does not have it, or has it and
  cannot run it, that is distinguished** from having settled nothing. They are
  different situations with different remedies, and the client already tells
  them apart when running a listing.
- **The answer is the server's.** Which machine a listing is for is settled by
  the precedence `machine-selection` already states, and the client asks rather
  than deciding: a `#MACHINE` line is the server's to read, and inference from
  the listing's text is the server's to do.
- **Asking costs the user nothing they would notice.** The question is asked
  when the listing being edited changes and when it is saved, not as they type,
  and an answer already known for the text in front of them is not asked for
  again.
- **Choosing a machine is reachable from it**, since that is what a user who has
  just read "no machine settled" wants next.
- Only the **VS Code client** is affected. Nothing existing changes and nothing
  is removed. **Not breaking.**

**The server contract does not change**, and no matching change is needed in the
`basically` repository — but this is worth being exact about, because the client
pays for it. The language server advertises no way to ask which machine a
document was bound to: its declared capabilities are the standard ones and it
offers no request, no command and no experimental entry of its own. So the
answer has to come from the operations conversation the client already holds for
running machines, which means a short-lived toolchain call rather than a question
down a connection that is already open. **The better answer is the server
reporting the bound machine over LSP** — as part of what it publishes about a
document, where it costs nothing, since the server has already worked it out to
decide what to colour. That is a change in the `basically` repository, and it
would let this requirement be met far more cheaply without changing what the
requirement says. This proposal is deliberately written so that it can be.

## Capabilities

### Modified Capabilities

- `vscode-client`: What the user gets is described as the listing recognised and
  served, two commands, the settings, and colour for every kind of run. Nothing
  says the client ever tells them which machine is in force — the account
  assumes a user who knows, and the one who does not has only a problem on an
  unbound listing to go on. A requirement is added for saying which machine a
  listing is being checked against, and for saying as plainly when none was
  settled.

`machine-selection` is deliberately absent and should stay so. Its precedence,
and its requirement that an unsettled listing is told exactly what to set, are
exactly right and are what this relies on; what is added here is a client
surface, not a change to how the question is answered or to what the user is
told when it cannot be. A reader looking for which machine wins should keep
finding one answer, in one place.

`server-resolution` is absent: which server is asked is unchanged, and this asks
the resolved one like everything else.

## Non-goals

- **Deciding the machine in the client.** The client reads no `#MACHINE` line
  and infers nothing from a listing's text. If the answer cannot be got from the
  server, nothing is shown rather than something guessed.
- **A second place the remedy is written.** The server's problem on the listing
  already names what to set, and `machine-selection` already requires that it
  name something the client offers. Restating it risks the two drifting apart.
- **Asking as the user types.** A short-lived process per keystroke is not a
  cost worth paying to keep a label fresh between one character and the next.
- **Saying which server or which runtime is in force.** Both are already in the
  output channel, and both are about the client's setup rather than about the
  file in front of the user. A label that tried to carry all three would say
  none of them.
- **Showing anything for a file that is not a BASIC listing.** A user editing
  something else is not being told about machines.
- **The Vim and Notepad++ clients.** Neither is asked to grow this. The Vim
  plugin registers the server with whichever LSP host is present and has no
  surface of its own to put this in; were the server to report the bound machine
  over LSP, a host that shows such things would get it for nothing, which is
  another reason to prefer that route.

## Impact

- **The VS Code client** gains a status surface and a third consumer of the
  operations conversation, after the panel and the debug session. It holds no
  machine and runs nothing: it asks a question and shows the answer.
- **What ships** is unchanged in shape. No new dependency, and no change to what
  the package carries.
- **The tests** gain the client's reading of the four answers, and the existing
  suite already establishes that the server distinguishes them.
- **The READMEs** gain a line on what the client tells the user about the
  machine in force, beside the account of the precedence that settles it.
- **The `basically` repository** should be asked for the LSP report described
  above. It is not a prerequisite — this can be built on the operations
  conversation and later moved — but it is the version of this that costs
  nothing, and it would serve every client rather than this one.
