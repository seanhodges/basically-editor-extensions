# machine-debug Specification

## Purpose

Debugging the listing being edited without leaving the editor, over the machine
the client already holds. This says how a debug session is started and what
settles the machine it runs on, what a breakpoint set in the gutter means to that
machine, what the user can see and do while a program is stopped, how a debugged
program is sent keys, how debugging and playing relate to one another, and what
the client says when a listing or a machine cannot be debugged at all.

## Requirements

### Requirement: A listing can be debugged without leaving the editor

The user SHALL be able to start debugging the listing being edited the way they
start debugging anything else in their editor, without naming a machine, writing
a configuration or opening anything first. The machine it runs on SHALL be the
machine that listing is already checked against, settled the way it is already
settled.

Starting a debug session SHALL run the listing being edited, unsaved changes
included, rather than whatever was last written to disk — the listing on the
screen is the one the user means to debug.

Where the user has arranged a configuration of their own, it SHALL be honoured;
where they have not, starting a debug session SHALL still work.

#### Scenario: Debugging the listing on screen

- **WHEN** the user starts a debug session while editing a listing
- **THEN** that listing runs on the machine it is checked against, and the
  session is under way with nothing else asked of the user

#### Scenario: Debugging unsaved work

- **WHEN** the user changes a listing without saving it and starts a debug
  session
- **THEN** the program that runs is the one on the screen

### Requirement: A breakpoint set in the editor stops the program before that line

A breakpoint the user sets SHALL stop the program before the BASIC line the row
it was set on carries, and the editor SHALL show the program stopped there. The
user SHALL be able to add and remove breakpoints while a session is under way,
and the change SHALL take effect for the rest of that session.

A row that carries no BASIC line number cannot be stopped on, and the client
SHALL tell the editor so, so that such a breakpoint is shown as one that will not
be hit rather than appearing to be set. The client SHALL NOT move the breakpoint
to a different line in order to make it work.

#### Scenario: Stopping on a breakpointed line

- **WHEN** the user sets a breakpoint on a numbered line and starts a debug
  session
- **THEN** the program stops before that line and the editor shows it stopped
  there

#### Scenario: A row that cannot hold a breakpoint

- **WHEN** the user sets a breakpoint on a row of a listing that carries no BASIC
  line number
- **THEN** the breakpoint is shown as one that will not be hit, and no other line
  is stopped on in its place

#### Scenario: Changing breakpoints mid-session

- **WHEN** the user adds a breakpoint while a program is stopped and then
  continues
- **THEN** the program stops at the newly added line

### Requirement: A stopped program shows where it is, what it holds, and what it drew

While a program is stopped the user SHALL be able to see the line it is stopped
before, the program's variables and what they hold, and what the machine has
drawn on its screen.

The variables SHALL be read from the machine the program is stopped on, and SHALL
be the server's account of them rather than anything the client works out. A
machine that cannot report its variables SHALL be said to be one, rather than
appearing to have none.

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

#### Scenario: The screen is a mirror

- **WHEN** the user types at the machine's screen while a program is stopped
- **THEN** nothing reaches the machine

### Requirement: A stopped program can be stepped and continued

The user SHALL be able to run a stopped program on to its next BASIC line, and to
continue it until it stops again or ends, using their editor's own controls for
those things. After each, the editor SHALL show where the program now is and what
its variables now hold.

The client SHALL claim only what BASIC on these machines can do — going on to the
next line, and continuing — and SHALL NOT claim setting a variable, a breakpoint
with a condition or a hit count, a logpoint, a data breakpoint, a restart, a
disassembly, or any other control it cannot carry out. A control the user is
offered SHALL do what it says.

Where the editor offers a form of stepping the client cannot decline, that
control SHALL run the program on to its next BASIC line, and SHALL NOT be
answered with a failure: a language with no call stack has nothing to step into
or out of, so going on to the next line is what stepping in any form means here.

When the program ends, the session SHALL end and SHALL say the program ended
rather than leaving the editor showing a program stopped on a line.

#### Scenario: Stepping a line at a time

- **WHEN** the user steps a stopped program
- **THEN** the program runs on to the next BASIC line, and the editor shows it
  stopped there with the variables as that line was reached with

#### Scenario: Continuing to the next breakpoint

- **WHEN** the user continues a stopped program that reaches another breakpointed
  line
- **THEN** the program stops there

#### Scenario: A program that ends

- **WHEN** the user continues a stopped program that runs to its end
- **THEN** the session ends and the user is told the program ended

#### Scenario: Controls that are not offered

- **WHEN** the user looks at the controls a debug session offers
- **THEN** nothing is offered that the session cannot carry out: no setting of a
  variable, no condition or hit count on a breakpoint, no logpoint, no data
  breakpoint, no restart and no disassembly

#### Scenario: Stepping where there is nothing to step into

- **WHEN** the user uses a form of stepping the editor offers whatever the client
  declares, such as stepping into or out of
- **THEN** the program runs on to its next BASIC line, and nothing fails

### Requirement: A debugged program is sent keys deliberately, and is told so

Because the machine's screen is a mirror, the user SHALL be able to send keys to
a debugged program by asking for them to be sent, and SHALL be told this is how
it is done at the moment it matters — when the program is waiting for input —
rather than being left pressing keys at a picture.

A key sent this way SHALL reach the program as the machine's own key, meaning
there what the same key means when a written schedule presses it.

#### Scenario: A program waiting for input

- **WHEN** a debugged program stops to wait for the user to type something
- **THEN** the user is told how to send keys to it

#### Scenario: Sending a key

- **WHEN** the user sends a key to a debugged program that is waiting for input
- **THEN** the machine receives that key and the program goes on

### Requirement: Debugging and running are different, and the user is told which they got

Running a listing gives the user a machine on its own clock that they type at.
Debugging gives them a machine that advances only as far as the editor asked, and
which stops where they said. A listing SHALL be started one way or the other.

Where starting one ends the other, the client SHALL say that is what happened,
rather than leaving the user with a screen that has quietly stopped answering or
a session that no longer stops anywhere.

#### Scenario: Debugging a listing that is already being played

- **WHEN** the user starts a debug session on a listing whose machine they are
  already playing
- **THEN** playing ends, the debug session begins, and the user is told that is
  what happened

#### Scenario: Running a listing that is being debugged

- **WHEN** the user runs a listing without debugging while a debug session is
  under way on it
- **THEN** the session ends, the machine can be typed at, and the user is told
  that is what happened

### Requirement: The client says what stops a listing being debugged, and what to do about it

Where a listing cannot be debugged, the user SHALL be told which of the reasons
it is and what to do about it, at the moment they ask rather than after a
failure. The reasons SHALL be told apart from one another: no machine can be
settled for the listing; the server cannot run that machine at all; or the
machine can be run but cannot be stepped.

A machine that cannot be stepped SHALL NOT stop the listing being run: the user
SHALL be offered that instead, because it is what is available to them.

#### Scenario: A listing whose machine cannot be settled

- **WHEN** the user asks to debug a listing that declares no machine, has none
  configured, and cannot be inferred to be for one
- **THEN** they are told exactly what to set, and it is something the client
  offers to set

#### Scenario: A machine that cannot be stepped

- **WHEN** the user asks to debug a listing whose machine cannot be stepped
- **THEN** they are told so, and are offered running the listing instead

#### Scenario: A machine the server cannot run

- **WHEN** the user asks to debug a listing whose machine this server cannot run
- **THEN** they are told that, and told the remedy, and it is told apart from a
  machine that can be run but not stepped

### Requirement: A debug session's machine is this editor's, and survives a server restart

The machine a debug session runs on SHALL be the editor's own: not the machine
the user's terminal is holding, and not shared with another editor window.
Ending the session SHALL let that machine go.

Restarting the language server SHALL NOT disturb a debug session, and a debug
session SHALL NOT disturb the language server. They are two conversations, and
the user restarting one because the language help went quiet SHALL NOT lose a
program they had stopped part-way through.

#### Scenario: A terminal and an editor debugging at once

- **WHEN** the user is debugging a listing in the editor and runs a program from
  their terminal
- **THEN** neither is given the other's machine and neither is disturbed by it

#### Scenario: Restarting the language server mid-session

- **WHEN** the user restarts the language server while a program is stopped on a
  line
- **THEN** the language server restarts and the program is still stopped where it
  was

#### Scenario: Ending the session

- **WHEN** the user stops a debug session
- **THEN** the machine it was running on is let go
