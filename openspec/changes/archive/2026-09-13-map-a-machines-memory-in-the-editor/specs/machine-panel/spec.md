## ADDED Requirements

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

## MODIFIED Requirements

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
