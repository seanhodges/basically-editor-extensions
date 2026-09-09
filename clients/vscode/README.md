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

Nothing needs installing: the language server ships inside this extension. It
runs no emulator and needs no ROM.

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

## More

The toolchain behind this extension also builds, runs and checks BASIC programs
outside the browser — see
[Editing in another editor](https://ba.sical.ly/docs/guide/language-server) and
[Installing the toolchain](https://ba.sical.ly/docs/guide/installing).

## Licence

GPL-3.0-or-later. This extension bundles
[`@ba.sical.ly/cli`](https://www.npmjs.com/package/@ba.sical.ly/cli), also
GPL-3.0-or-later, with its own licence text in `server/LICENSE`.
