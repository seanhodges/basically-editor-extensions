# machine-panel Specification

## Purpose

Running the listing being edited without leaving the editor, and playing the
machine it runs on. This says which machine that is and what is run on it, that
the machine belongs to this editor rather than to the user's terminal and is let
go when the panel closes, what the client says when a listing cannot be run
rather than failing at it, how the user comes to agree to an image being
obtained, what the user can see of what a played machine holds while it runs,
and what the client must say about what holding the panel's address admits.

## Requirements

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

The memory map SHALL be shown from an address of its own, and the client SHALL
say, wherever the map is documented, that whoever holds that address can watch
the machine's memory and can do nothing else — not act on the machine, and not
learn what any address holds.

That statement SHALL likewise be made in the client's own words rather than by
reference to what the panel's address admits, so that neither claim can be
carried across to the other. The two addresses admit different things, and the
client SHALL NOT describe them as one.

#### Scenario: A user reading what the panel is

- **WHEN** the user reads the client's description of the panel
- **THEN** it says that whoever holds the panel's address can type at the
  machine, not merely see it

#### Scenario: A user reading what the memory map is

- **WHEN** the user reads the client's description of the memory map
- **THEN** it says that whoever holds the map's address can watch the machine's
  memory and can do nothing else, and says it without reference to what the
  panel's address admits

### Requirement: A played listing's variables can be watched while it runs

The user SHALL be able to see what the variables of the listing they are playing
hold, in the editor, while it runs. What they are shown SHALL follow the machine:
a program that changes a variable SHALL be seen to change it, without the user
asking again.

The variables SHALL be the server's account of them, read from the machine being
played, rather than anything the client works out. Because the machine goes on
running between reads, two readings MAY differ, and that SHALL NOT be reported as
a fault — it is the program running.

Reading SHALL NOT disturb the machine or what the user is typing at it: a user
watching the variables and a user not watching them SHALL see the same program
run the same way.

A machine that cannot report its variables SHALL be said to be one, rather than
appearing to have none. Where this editor is holding no machine, the user SHALL
be told what to do to get one rather than shown an empty table.

Where the server being used does not answer what a played machine's variables
hold, the user SHALL be told that this is what has happened and what the remedy
is, rather than being shown nothing, an emptiness, or a failure.

#### Scenario: Watching a program change a variable

- **WHEN** the user runs a listing that counts, and watches its variables
- **THEN** the count is seen to rise while the program runs, without the user
  asking for it again

#### Scenario: Watching does not change the run

- **WHEN** the user plays a listing while watching its variables, and plays the
  same listing without watching them
- **THEN** the program runs the same way both times and what the user types
  reaches the machine the same way

#### Scenario: A machine that cannot report its variables

- **WHEN** the user plays a listing on a machine that cannot report what its
  variables hold
- **THEN** they are told that this machine cannot report them, rather than being
  shown none

#### Scenario: Nothing has been run yet

- **WHEN** the user looks for the variables of a window that is holding no
  machine
- **THEN** they are told what to do to get one, rather than shown an empty table

#### Scenario: A server that does not answer for a played machine

- **WHEN** the user plays a listing on a server that refuses to report the
  variables of a machine being played
- **THEN** they are told that this server does not report them while the machine
  is being played, and what the remedy is

### Requirement: A played listing's memory map can be watched while it runs

The user SHALL be able to see a map of the memory of the machine they are
playing, in the editor, in a place of their own that they can put where they
work. The map SHALL show the machine's memory layout and the addresses the
machine is touching, and SHALL follow the machine: a program that begins working
somewhere else in memory SHALL be seen to, without the user asking again.

What is shown SHALL be the toolchain's account of the machine's memory. The
client SHALL name the address it is shown from and frame it, and SHALL keep no
account of the layout, of what the machine is touching, or of how either is
drawn.

Watching SHALL NOT disturb the machine or what the user is typing at it: a user
watching the map and a user not watching it SHALL see the same program run the
same way.

A machine that cannot be mapped SHALL be said to be one, and SHALL be said which
way it cannot: a machine whose memory layout the toolchain does not describe has
no map, and a machine that cannot report what it is touching has a map that
shows no activity. These are different answers and SHALL be given as different
answers.

Where this editor is holding no machine, the user SHALL be told what to do to
get one rather than shown an empty frame. Looking at the map SHALL NOT itself
start a server or a machine.

Where the server being used does not project a memory map at all, the user SHALL
be told that this is what has happened and what the remedy is, rather than being
shown nothing, an emptiness, or a failure.

#### Scenario: Watching a program move about in memory

- **WHEN** the user runs a listing that fills an array, and watches its memory
  map
- **THEN** the addresses the program is writing to are seen to light up while it
  runs, without the user asking for it again

#### Scenario: Watching does not change the run

- **WHEN** the user plays a listing while watching its memory map, and plays the
  same listing without watching it
- **THEN** the program runs the same way both times and what the user types
  reaches the machine the same way

#### Scenario: A machine with no described layout

- **WHEN** the user plays a listing on a machine whose memory layout the
  toolchain does not describe
- **THEN** they are told that this machine's memory cannot be mapped, rather
  than being shown an empty map

#### Scenario: A machine that cannot report what it is touching

- **WHEN** the user plays a listing on a machine that has a described layout but
  cannot report which addresses it is touching
- **THEN** the layout is shown and they are told that this machine cannot report
  what it is touching, rather than being left to read a dark map as a program
  that touched nothing

#### Scenario: Nothing has been run yet

- **WHEN** the user looks for the memory map of a window that is holding no
  machine
- **THEN** they are told what to do to get one, and no server and no machine is
  started by their having looked

#### Scenario: A server that projects no map

- **WHEN** the user plays a listing on a server that cannot project a memory map
- **THEN** they are told that this server does not project one, and what the
  remedy is
