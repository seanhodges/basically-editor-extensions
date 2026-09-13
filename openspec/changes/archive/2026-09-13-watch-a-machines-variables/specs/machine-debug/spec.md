## MODIFIED Requirements

### Requirement: A stopped program shows where it is, what it holds, and what it drew

While a program is stopped the user SHALL be able to see the line it is stopped
before, the program's variables and what they hold, and what the machine has
drawn on its screen.

The variables SHALL be read from the machine the program is stopped on, and SHALL
be the server's account of them rather than anything the client works out. A
machine that cannot report its variables SHALL be said to be one, rather than
appearing to have none.

What the program holds SHALL also be visible in a place of the user's own, which
they can put where they work and which does not come and go with the session.
What it shows SHALL be read again each time the program stops somewhere new, so
that what the user is looking at is what the line just reached was reached with.
Where the editor draws a pane of its own for a stopped session, that pane SHALL
be left as the editor draws it.

What the machine has drawn SHALL be shown as a mirror of its screen: the user
SHALL be able to see it and SHALL NOT be able to type at it, because a machine
being typed at by a person is not a machine that can be stopped or measured.

#### Scenario: Looking at a stopped program

- **WHEN** a program stops on a breakpoint
- **THEN** the stopped line is shown in the editor, the program's variables are
  shown with their values, and the machine's screen is visible

#### Scenario: A machine that cannot report its variables

- **WHEN** a program stops on a machine that cannot report what its variables
  hold
- **THEN** the user is told that this machine cannot report them, rather than
  being shown none

#### Scenario: Following a stepped program

- **WHEN** the user steps a stopped program to a line that changes what a
  variable holds
- **THEN** what the user is shown is what that variable holds at the line now
  reached, without their having asked for it again

#### Scenario: Where the variables are shown

- **WHEN** the user has put the place the variables are shown where they want it
  and starts a debug session
- **THEN** the variables appear there, and it is still there when the session ends

#### Scenario: The screen is a mirror

- **WHEN** the user types at the machine's screen while a program is stopped
- **THEN** nothing reaches the machine
