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
emulator it runs machines on.

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

## Settings

| Setting                     | What it does                                                       |
| --------------------------- | ------------------------------------------------------------------ |
| `basically.machine`         | The machine listings default to, by id or full name                |
| `basically.server.path`     | Serve from a `basically` command or checkout instead of the bundled copy |
| `basically.server.nodePath` | The Node.js that runs the bundled server                           |
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
