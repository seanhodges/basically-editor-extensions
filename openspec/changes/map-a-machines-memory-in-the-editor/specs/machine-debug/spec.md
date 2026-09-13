## ADDED Requirements

### Requirement: What a stepped program touched is visible in the editor

While a listing is being debugged the user SHALL be able to see a map of the
memory of the machine the program is stopped on, in the same place they would
see it for a listing they are playing.

The map SHALL show what the program touched as it was stepped, so that a step is
readable as the memory it moved and not only as the line it reached. What it
shows SHALL follow the program each time it moves, so that what the user is
looking at is what the line just reached was reached with.

The map SHALL be available whether or not any pane the editor draws for a
session is open, and SHALL NOT come and go with the session: a map the user has
docked SHALL still be there for the next one.

Where the editor draws panes of its own for a stopped session, they SHALL be
left as the editor draws them.

A machine that cannot be mapped SHALL be said to be one, on the same terms and
with the same distinction as for a listing being played.

#### Scenario: Stepping a line that writes to memory

- **WHEN** the user steps a line that pokes a value into the screen memory
- **THEN** the map shows that the screen memory was written, without the user
  asking for it again

#### Scenario: The map outlasts the session

- **WHEN** the user debugs a listing with the memory map docked, and the session
  ends
- **THEN** the map is still where they put it, and is there for the next session

#### Scenario: A debugged machine that cannot report what it touches

- **WHEN** the user debugs a listing on a machine that has a described layout
  but cannot report which addresses it is touching
- **THEN** the layout is shown and they are told that this machine cannot report
  what it is touching
