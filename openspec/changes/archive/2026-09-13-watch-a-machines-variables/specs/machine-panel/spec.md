## ADDED Requirements

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
