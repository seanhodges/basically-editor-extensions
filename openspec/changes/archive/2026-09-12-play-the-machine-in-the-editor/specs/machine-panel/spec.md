## ADDED Requirements

### Requirement: A listing can be run and played without leaving the editor

The user SHALL be able to run the listing they are editing and be shown the
machine it runs on, in the editor, and SHALL be able to type at that machine —
answering a program's question, driving a game, or working at the machine's own
prompt.

The machine a listing runs on SHALL be the machine that listing is already
checked against, settled the same way and by the same order of precedence, so
that the machine a user sees their problems against is the machine they see it
run on.

What is run SHALL be the listing as it stands in the editor, including changes
the user has not saved, so that a listing with no problems shown can always be
run as shown.

#### Scenario: Running a listing

- **WHEN** the user runs the listing they are editing
- **THEN** a panel shows that listing running on its machine, and what the user
  types reaches the machine

#### Scenario: Running unsaved work

- **WHEN** the user changes a listing without saving it and runs it
- **THEN** what runs is what is in the editor, not what was last saved

#### Scenario: The machine it is checked against

- **WHEN** a listing declares which machine it is for, and the user runs it
- **THEN** it runs on that machine, the same one its problems are reported
  against

### Requirement: The panel's machine belongs to this editor

The machine shown in the panel SHALL be held for this editor alone. It SHALL NOT
be a machine the user is holding at a terminal, and nothing the user does at a
terminal SHALL disturb it or be disturbed by it. Two editor windows SHALL NOT
share one machine.

A machine SHALL be let go when the panel showing it closes, so that a user who
closes a panel leaves nothing running behind, and so SHALL a machine whose
editor stops without saying so.

#### Scenario: A machine at a terminal and a machine in the editor

- **WHEN** the user is holding a machine at a terminal and runs a listing in the
  editor
- **THEN** each has its own machine, and neither shows what was done to the other

#### Scenario: Closing the panel

- **WHEN** the user closes the panel
- **THEN** the machine it was showing is let go

#### Scenario: An editor that stops without closing the panel

- **WHEN** the editor stops while a panel is open
- **THEN** the machine it was showing is let go

### Requirement: The client says what stops a listing running, and what to do about it

Where a listing cannot be run, the user SHALL be told why and what to do about
it, before anything is attempted rather than after something has failed. This
SHALL cover a machine the server being used cannot run, and a listing for which
no machine can be settled.

Whether a machine can be run SHALL be established by asking the server being
used, not from anything the client holds of its own, so that the answer can
never name a machine that server does not have or miss one it has gained.

Where the server being used cannot run a particular machine, the user SHALL be
told which machine and SHALL be told that pointing the client at a toolchain
they install themselves is the remedy — on the same terms the client already
states for choosing which server serves it.

#### Scenario: A machine this server cannot run

- **WHEN** the user runs a listing for a machine the server being used cannot run
- **THEN** they are told which machine it is, that this server cannot run it, and
  that pointing the client at their own toolchain is the remedy

#### Scenario: No machine can be settled

- **WHEN** the user runs a listing whose machine cannot be settled from its own
  declaration, their configuration, or its text
- **THEN** they are told exactly what to set, rather than a machine being guessed

#### Scenario: A server that gains a machine

- **WHEN** the server being used is changed for one that can run a machine the
  previous one could not
- **THEN** running that machine is offered, without the client having been
  changed

### Requirement: Obtaining a ROM is agreed to once, and declining is not a failure

Where running a machine needs an image the toolchain has not obtained, the user
SHALL be asked before anything is obtained, and SHALL be told what would be
obtained and where the terms are set out. The client SHALL do the asking, rather
than leaving the toolchain to ask something it has no way to reach.

Agreement SHALL be recorded so that it covers later machines and later runs, and
the user SHALL NOT be asked again for each.

Declining SHALL NOT be reported as a failure. The user SHALL be told what was
declined and how to change their mind, and SHALL be left exactly as they were.

#### Scenario: Asked before the first image is obtained

- **WHEN** the user runs a machine whose image has not been obtained and has not
  agreed before
- **THEN** they are asked first, and told what would be obtained and where its
  terms are set out

#### Scenario: Agreeing once

- **WHEN** the user agrees, and later runs a different machine whose image is not
  yet held
- **THEN** it is obtained without asking again

#### Scenario: Declining

- **WHEN** the user is asked and declines
- **THEN** nothing is obtained, they are told what was declined and how to change
  it, and this is not reported as the run having failed

### Requirement: The panel says what holding its address admits

The panel SHALL be shown from an address the toolchain gives it, and the client
SHALL say plainly, wherever the panel is documented, that whoever holds that
address can act on the machine — typing at it — rather than only watch it.

That statement SHALL be made in the client's own words rather than by reference
to any weaker claim made elsewhere about watching a machine, so that a reader
cannot carry the weaker one across to this.

#### Scenario: A user reading what the panel is

- **WHEN** the user reads the client's description of the panel
- **THEN** it says that whoever holds the panel's address can type at the
  machine, not merely see it
