# Basically for VS Code

Language support for retro BASIC — the same help the
[Basically IDE](https://ba.sical.ly) gives in the browser, for whichever machine
each listing is written for.

- **Problems as you type**, with a genuine error underlined differently from an
  advisory one.
- **Completion** of that machine's own keywords and its multi-line block
  constructs, and never anything the machine doesn't have.
- **Hover** a keyword to see how it's written and what it does — including one
  typed in a shorter spelling the machine accepts.
- **Go to definition**, from a `GOTO`/`GOSUB` to the line it targets, or from a
  procedure call to where it's defined.
- **Outline and symbols**, and **every use of a variable**, following the
  machine's own rules for what makes two names the same variable.
- **Colour**, from the machine's own reading of the listing — so a name that is
  a keyword on one machine and an ordinary variable on another is coloured as
  whichever it is here.

Nothing needs installing: the toolchain ships inside this extension, with the
emulator it runs machines on, and the extension carries the modules it loads
itself.

## Running a listing

**Basically: Run this listing and play its machine** runs what you're editing —
unsaved changes and all — and opens a panel showing the machine it's written
for. You can type at it: answer a program's question, drive a game, or work at
the machine's own `READY` prompt. It's the machine your problems are reported
against, settled the same way.

The panel is this window's, and the machine in it is this editor's own. It isn't
the machine your terminal is holding, neither disturbs the other, and closing the
panel lets the machine go. Running a second listing plays it in the same panel.

The panel is a page served at an address on your own computer, and **whoever
holds that address can type at the machine, not merely watch it** — it's a way
of acting on the machine, so treat it as a secret.

A few key chords never reach the machine: VS Code claims them first, wherever the
focus is. Which ones depends on your keybindings — anything you've bound at the
workbench level, and the editor's own defaults, are taken before the panel sees
them. Rebind what you need for a particular game under **Preferences: Open
Keyboard Shortcuts**.

## Debugging a listing

Start debugging the way you start debugging anything else — **Run and Debug**,
or <kbd>F5</kbd> — and the listing you're editing runs on the machine it's
checked against, unsaved changes and all. You don't have to write a launch
configuration; if you have one, it's used.

Set a breakpoint in the gutter and the program stops before that line. The
stopped line is highlighted, the **Variables** pane shows what the program holds
as the machine displays it, and **Step Over** and **Continue** do what they say.
A breakpoint is a BASIC line number, so a row carrying no line number — a blank
row, the `#MACHINE` line — is shown as one that won't be hit, rather than
quietly stopping somewhere else. Add and remove breakpoints while a session is
running; the change holds for the rest of it.

BASIC as these machines run it has a line and the next line, so there is nothing
to step into or out of: every form of stepping runs on to the next BASIC line.
Nothing sets a variable, no breakpoint takes a condition or a hit count, and
there is no disassembly — the session offers none of it rather than offering
buttons that fail when used.

**The machine is mirrored while it's debugged, and typing at it does nothing.**
A machine somebody is typing at runs on its own clock, and a machine on its own
clock is not one that can be stopped on a line or measured — so the panel shows
the screen and takes no input. To send keys to a program that's waiting for one,
type a schedule in the **Debug Console**: `PRESS ENTER`, or
`TYPE "FRED"; PRESS ENTER`. A key sent that way means exactly what the same key
means in a written schedule. `basically info <machine>` lists the key names a
machine answers to.

## Watching what a program holds

**Basically variables**, in the panel beside the terminal, shows what the
machine this window is holding holds — a row per variable, its value beside its
name, what kind it is in the tooltip. Drag it to the sidebar if you would rather
have it there.

It works both ways a listing is started. **While you're playing a listing** the
machine goes on running, so the table follows it: a program that counts is seen
to count. Because the machine is moving between readings, two readings may
differ — that's the program running, not a fault. **While you're debugging one**
it shows what the stopped program holds, read again each time the program stops
somewhere new, and it stays where you put it when the session ends.

Every value is the server's account of the machine, not something the client
works out. A machine that can't report what its variables hold says so rather
than appearing to hold none, and nothing here sets a variable or watches an
expression: the toolchain reports what a program holds and offers no way to
evaluate or assign anything.

Reading a machine that's being played needs a toolchain that answers it. Point
`basically.server.path` at an older copy and the view says so, and the values
are still there each time a debugged program stops.

**Running and debugging are the two ways to start a listing, and they're
different.** Running gives you a machine on its own clock that you type at;
debugging gives you one that advances only as far as the editor asked. Starting
one ends the other, and you're told that's what happened.

Not every machine can say which BASIC line it's executing, and one that can't
can't be stepped. You're told so when you ask to debug — along with the offer to
run the listing instead, which is what's left — rather than after a failed
session. Whether a machine can be stepped is asked of the server that's actually
serving you, so pointing `basically.server.path` at a toolchain of your own gets
that copy's answer.

Ending the session lets the machine go. Restarting the language server doesn't
disturb a session, and a session doesn't disturb the language server: they're
two conversations with two children of the same toolchain.

### ROMs

Most machines need their original firmware, which isn't part of the toolchain,
isn't shipped with this extension, and carries its own terms. The first time you
run a machine that needs an image you'll be asked before anything is downloaded,
and told where the terms are set out. Agreeing once covers later machines and
later runs. Declining changes nothing — you'll be asked again next time you run
one.

Some machines need nothing: their emulator carries its own images, and they run
on a bare install. The extension asks the server which are which rather than
keeping a list, so the answer is always the one that copy can actually honour.

## Letting your agent use the toolchain

The toolchain behind this extension can work for the chat agent built into your
editor, and the extension tells the editor where it is — so there is nothing to
install and nothing to configure. Ask your agent to write a BASIC program and it
can check it for problems, build it, run it on the real machine, read the screen
that machine drew, press keys at it and read it again, measure where the time
went, and stop the program on a line to see what its variables hold.

The agent gets the same server that serves your listings, run by the same
Node.js, so `basically.server.path` points both at once. Which tools it has is
the toolchain's to say, not this extension's — your editor lists them, under
**Basically**, wherever it shows you the servers it has been given.

The machine the agent works on follows the same order as everywhere else: what
the program itself declares wins, and `basically.machine` is what it falls back
on. The agent's machine is its own — it is not the one the panel is playing, and
neither shows the other.

Set `basically.mcp.enabled` to `false` if you would rather your agent were not
offered the toolchain. Your listings go on being served exactly as before.

## Which machine?

Every listing is for one machine, and the extension needs to know which. It
takes the first of these that answers:

1. **The listing says so** — a `#MACHINE zx81` line at the top always wins, so
   one project can hold programs for several machines.
2. **You said so** — the `basically.machine` setting. Run **Basically: Choose
   the machine to check against** from the command palette to pick from the
   machines this server has.
3. **It can be worked out** from the listing's own text — and where several
   machines would read it equally, you're told to choose rather than guessed at.

Whichever of those answered, the status bar says which machine the listing
you're editing is being checked against, and says as plainly when none could be
settled — so a listing that's correctly left uncoloured doesn't look like an
extension that has stopped working. Click it to choose a machine. It's the
status bar's, so you can hide it there like anything else.

## Settings

| Setting                     | What it does                                                       |
| --------------------------- | ------------------------------------------------------------------ |
| `basically.machine`         | The machine listings default to, by id or full name                |
| `basically.server.path`     | Serve from a `basically` command or checkout instead of the bundled copy |
| `basically.server.nodePath` | The Node.js that runs the bundled server                           |
| `basically.mcp.enabled`     | Offer the toolchain to this editor's chat agent (on by default)    |
| `basically.trace.server`    | Log the conversation with the server to the _Basically_ output channel |

Running a listing uses the same three chains as serving the language: which
machine it's for, which server to start, and which Node runs it. Pointing
`basically.server.path` at a toolchain you installed yourself is also the remedy
where the bundled copy can't run something.

## More

The toolchain behind this extension also builds, runs and checks BASIC programs
outside the browser — see
[Editing in another editor](https://ba.sical.ly/docs/guide/language-server) and
[Installing the toolchain](https://ba.sical.ly/docs/guide/installing).

## Licence

GPL-3.0-or-later. This extension bundles
[`@ba.sical.ly/cli`](https://www.npmjs.com/package/@ba.sical.ly/cli), also
GPL-3.0-or-later, with its own licence text in `server/LICENSE`, and
[`jsbeeb`](https://github.com/mattgodbolt/jsbeeb) — the emulator the toolchain
runs machines on — under its own licence beside it.
