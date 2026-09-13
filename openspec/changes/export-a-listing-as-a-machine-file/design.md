## Context

The client holds two conversations with the toolchain beside the language
server's: the operations one it runs and debugs a machine over, and the one it
hands to the editor's own agent. `build` is an operation of the same toolchain,
reachable over the first of those and needing neither a ROM nor a machine, so
nothing about how a server is found or run changes here.

What is new is a direction of travel. Everything this client has ever sent the
toolchain is the text of a buffer, and everything it has ever received is
something to say or an address to point a webview at. See the READMEs and
`CLAUDE.md` for the three precedence chains and the module map; this adds a
fourth kind of thing — bytes, and a place on disk to put them.

## Goals / Non-Goals

**Goals:**

- A listing can be exported without leaving the editor, in any format its
  machine has.
- The client holds no fact about machines or formats: what is offered, what it is
  called, and what came back are the server's.
- A fatal problem in the listing writes nothing.
- The command is reachable both by name and from the editor itself.

**Non-Goals:**

- Import, cassette playback, microphone capture, the serial bridge.
- A block model in the client.
- Any change to how a server is found, run, or pinned.

## Decisions

**The operations conversation, not a one-shot command.** `build` has a
command-line route, so `argsFor(launch, 'build', …)` would work and the client
already invokes the toolchain that way for `machines` and for ROM consent. But
the command line has no `--json` on `build`: it writes the file itself and
reports the rest as prose on stderr. Over the operations conversation the whole
outcome arrives as it was declared — the target chosen, the tokenizer's problems,
and each file's bytes and size — which is what lets the client tell a fatal
problem from a written file, and name every file produced. The bytes crossing the
conversation base64-encoded is the cost, and it is the same cost the agent pays.

**A conversation of its own, holding no machine.** `build` needs no machine, and
the panel's conversation is the one holding the played machine — borrowing it
would tie an export to whether something is being played, and disposing of it
would let that machine go. The status item's conversation is the right shape and
the wrong owner: a command should not depend on a status bar item existing. So
this owns one, started on first use, resolved from configuration per question and
dropped on any error that is not a refusal, exactly as the status item's is. That
makes it the fourth site resolving a launch from configuration; extracting a
shared helper is a reasonable tidy and is not part of this.

**The user picks the format, then the place.** `build` can infer the target from
the extension of the name it is given, which is how the command line works — a
caller writing `prog.wav` gets the tape audio without naming a target. Inferring
would mean a save dialog with no default extension and a user expected to know
what to type. So the machine's formats are asked for, shown as a list under the
server's own labels, and the chosen one seeds the save dialog's name and
extension — and is then named explicitly in the call, so the two cannot disagree.

**A machine that cannot be run can still be exported to.** Building reads no ROM.
The plan for an export therefore reuses the shape of the plan for a run — the
machine is settled the same way, by the listing's own declaration and then the
setting — but must not refuse on the answer that gates running. Getting this
wrong would be invisible in testing on a machine whose emulator carries its own
images, and would deny an export to exactly the user most likely to want one.

**Where more than one file comes back.** The user named one path; the rest are
written beside it under the names the format gave them. The alternative — a
dialog per file — asks a user who has not been told how many are coming. What
they get instead is a report naming every path written.

**Only the palette entry is unconditional.** The toolbar entry is bound to a
BASIC listing being what is in front of the user, because a title bar is about
the file beneath it. The palette entry keeps the `when` clause that the run
command's already has, for the same reason: a command about the listing being
edited is not one to offer when there is none.

**Icons are codicon ids, not bitmap pairs.** A codicon follows the user's theme
without the extension shipping two images and choosing between them, and the
command's own title is what the button's tooltip says — so nothing about a
command's wording is written twice.

## Risks / Trade-offs

- **A large program's bytes cross the conversation base64-encoded** → programs
  these machines can load are measured in kilobytes; the framing already carries
  screenshots.
- **The client writes files for the first time, and a save dialog can overwrite**
  → the editor's own save dialog asks about an existing file, so nothing here
  needs to. Files after the first are written beside it without asking, which is
  the one place this could surprise someone; it is reported rather than silent.
- **A toolbar entry naming a command that is not contributed is a button the
  editor answers as not found** → the manifest is cross-checked against itself in
  the client-against-itself suite, in the shape the debug capabilities already
  are.
- **Three buttons is a toolbar, and a narrow editor overflows** → the editor moves
  what does not fit into its own overflow menu rather than dropping it. Checked by
  hand, since no test here can see a title bar.
